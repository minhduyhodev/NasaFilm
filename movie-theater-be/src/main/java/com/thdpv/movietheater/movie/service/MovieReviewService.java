package com.thdpv.movietheater.movie.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.cache.MovieReviewCacheEvictor;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewRequest;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;
import com.thdpv.movietheater.movie.dto.response.MovieReviewResponse;
import com.thdpv.movietheater.movie.dto.response.MovieReviewStatsResponse;
import com.thdpv.movietheater.movie.dto.response.MovieReviewSummaryResponse;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewReportRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.movie.util.ReviewVibeTagUtil;
import com.thdpv.movietheater.movie.support.ReviewActionRateLimiter;
import com.thdpv.movietheater.movie.util.ReviewTextModerationUtil;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class MovieReviewService {

    private static final String REVIEW_ELIGIBILITY_MESSAGE =
            "Chi khach hang da mua ve rap hoac ve online moi co the danh gia phim nay.";
    private static final String REVIEW_COOLDOWN_MESSAGE =
            "Ban vua gui danh gia cho phim nay. Vui long doi 24 gio truoc khi gui danh gia moi.";
    private static final Duration REVIEW_COOLDOWN = Duration.ofHours(24);

    private final MovieReviewRepository movieReviewRepository;
    private final MovieReviewReportRepository movieReviewReportRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final SystemConfigService systemConfigService;
    private final MovieReviewStatsService movieReviewStatsService;
    private final MovieReviewCacheEvictor movieReviewCacheEvictor;
    private final ReviewActionRateLimiter reviewActionRateLimiter;

    public MovieReviewService(
            MovieReviewRepository movieReviewRepository,
            MovieReviewReportRepository movieReviewReportRepository,
            MovieRepository movieRepository,
            UserRepository userRepository,
            BookingRepository bookingRepository,
            SystemConfigService systemConfigService,
            MovieReviewStatsService movieReviewStatsService,
            MovieReviewCacheEvictor movieReviewCacheEvictor,
            ReviewActionRateLimiter reviewActionRateLimiter) {
        this.movieReviewRepository = movieReviewRepository;
        this.movieReviewReportRepository = movieReviewReportRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.systemConfigService = systemConfigService;
        this.movieReviewStatsService = movieReviewStatsService;
        this.movieReviewCacheEvictor = movieReviewCacheEvictor;
        this.reviewActionRateLimiter = reviewActionRateLimiter;
    }

    @Transactional(readOnly = true)
    public Page<MovieReviewResponse> getReviews(
            UUID movieUuid,
            Pageable pageable,
            UUID currentUserUuid,
            boolean onlyWithComment,
            String vibeTag) {
        ensureMovieVisible(movieUuid);
        Pageable safePageable = sanitizeReviewPageable(pageable);
        String safeVibeTag = ReviewVibeTagUtil.validateFilterTag(vibeTag);

        Page<MovieReview> reviewPage = movieReviewRepository.findVisibleReviews(
                movieUuid, MovieReviewStatus.VISIBLE, onlyWithComment, safeVibeTag, safePageable);
        List<MovieReview> reviews = reviewPage.getContent();

        Map<UUID, User> usersById = loadUsersById(reviews.stream().map(MovieReview::getUserUuid).collect(Collectors.toSet()));
        Set<UUID> reportedReviewIds = loadReportedReviewIds(currentUserUuid, reviews);

        var content = reviews.stream()
                .map(review -> toResponse(review, currentUserUuid, usersById, reportedReviewIds))
                .toList();
        return new PageImpl<>(content, safePageable, reviewPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public MovieReviewSummaryResponse getSummary(UUID movieUuid, UUID currentUserUuid) {
        ensureMovieVisible(movieUuid);

        MovieReviewStatsResponse stats = movieReviewStatsService.getStats(movieUuid);

        MovieReviewSummaryResponse summary = new MovieReviewSummaryResponse();
        summary.setTotalReviews(stats.getTotalReviews());
        summary.setAverageRating(stats.getAverageRating());
        summary.setRatingDistribution(stats.getRatingDistribution());

        Map<String, Long> vibeTagCounts = buildVibeTagCounts(movieUuid);
        summary.setVibeTagCounts(vibeTagCounts);
        summary.setBestOnBigScreen(
                ReviewVibeTagUtil.isBestOnBigScreen(stats.getTotalReviews(), vibeTagCounts));

        if (currentUserUuid != null) {
            boolean hasPurchased = hasConfirmedPurchase(currentUserUuid, movieUuid);
            if (!hasPurchased) {
                summary.setCanReview(false);
                summary.setReviewEligibilityMessage(REVIEW_ELIGIBILITY_MESSAGE);
            } else if (isInCooldown(movieUuid, currentUserUuid)) {
                summary.setCanReview(false);
                summary.setReviewCooldownActive(true);
                summary.setReviewEligibilityMessage(REVIEW_COOLDOWN_MESSAGE);
            } else {
                summary.setCanReview(true);
            }
        } else {
            summary.setCanReview(false);
        }

        return summary;
    }

    @Transactional
    public MovieReviewResponse createReview(UUID movieUuid, CreateMovieReviewRequest request, String userEmail) {
        ensureMovieVisible(movieUuid);
        User user = getActiveUser(userEmail);
        reviewActionRateLimiter.assertCreateReviewAllowed(user.getId().toString());

        if (!hasConfirmedPurchase(user.getId(), movieUuid)) {
            throw new AppException(ErrorCode.REVIEW_PURCHASE_REQUIRED, REVIEW_ELIGIBILITY_MESSAGE);
        }

        assertReviewCooldown(movieUuid, user.getId());

        String normalizedComment = normalizeComment(request.getComment());
        List<String> vibeTags = ReviewVibeTagUtil.normalizeAndValidate(request.getVibeTags());

        MovieReview review = new MovieReview();
        review.setMovieUuid(movieUuid);
        review.setUserUuid(user.getId());
        review.setRating(request.getRating());
        review.setComment(normalizedComment);
        review.setVibeTags(ReviewVibeTagUtil.toJson(vibeTags));
        review.setStatus(MovieReviewStatus.VISIBLE);

        MovieReview saved = movieReviewRepository.save(review);
        movieReviewCacheEvictor.evictSummary(movieUuid);
        return toResponse(saved, user.getId(), Map.of(user.getId(), user), Set.of());
    }

    @Transactional
    public void deleteMyReview(UUID movieUuid, UUID reviewUuid, String userEmail) {
        ensureMovieVisible(movieUuid);
        User user = getActiveUser(userEmail);
        MovieReview review = movieReviewRepository
                .findByUuidAndMovieUuidAndUserUuid(reviewUuid, movieUuid, user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));
        movieReviewRepository.delete(review);
        movieReviewCacheEvictor.evictSummary(movieUuid);
    }

    private Pageable sanitizeReviewPageable(Pageable pageable) {
        int page = Math.max(pageable.getPageNumber(), 0);
        int size = pageable.getPageSize() > 0 ? Math.min(pageable.getPageSize(), 50) : 10;
        Sort sort = pageable.getSort().isSorted() ? sanitizeReviewSort(pageable.getSort()) : defaultReviewSort();
        return PageRequest.of(page, size, sort);
    }

    private Sort defaultReviewSort() {
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private Sort sanitizeReviewSort(Sort sort) {
        Sort sanitized = Sort.unsorted();
        for (Sort.Order order : sort) {
            String property = order.getProperty();
            if ("createdAt".equals(property) || "rating".equals(property)) {
                sanitized = sanitized.and(Sort.by(order.getDirection(), property));
            }
        }
        return sanitized.isSorted() ? sanitized : defaultReviewSort();
    }

    private void assertReviewCooldown(UUID movieUuid, UUID userUuid) {
        if (isInCooldown(movieUuid, userUuid)) {
            throw new AppException(ErrorCode.REVIEW_COOLDOWN_ACTIVE, REVIEW_COOLDOWN_MESSAGE);
        }
    }

    private boolean isInCooldown(UUID movieUuid, UUID userUuid) {
        OffsetDateTime cooldownSince = OffsetDateTime.now().minus(REVIEW_COOLDOWN);
        return movieReviewRepository.existsByMovieUuidAndUserUuidAndCreatedAtAfter(
                movieUuid, userUuid, cooldownSince);
    }

    private Map<UUID, User> loadUsersById(Set<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private Set<UUID> loadReportedReviewIds(UUID currentUserUuid, List<MovieReview> reviews) {
        if (currentUserUuid == null || reviews.isEmpty()) {
            return Set.of();
        }
        Set<UUID> reviewIds = reviews.stream().map(MovieReview::getUuid).collect(Collectors.toSet());
        Set<UUID> reported = movieReviewReportRepository.findReportedReviewUuids(currentUserUuid, reviewIds);
        return reported != null ? reported : Set.of();
    }

    private boolean hasConfirmedPurchase(UUID userUuid, UUID movieUuid) {
        return bookingRepository.hasConfirmedPurchaseForMovie(userUuid, movieUuid);
    }

    private void ensureMovieVisible(UUID movieUuid) {
        Movie movie = movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
        if ("DELETED".equalsIgnoreCase(movie.getStatus())) {
            throw new AppException(ErrorCode.MOVIE_NOT_FOUND);
        }
    }

    private User getActiveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private MovieReviewResponse toResponse(
            MovieReview review,
            UUID currentUserUuid,
            Map<UUID, User> usersById,
            Set<UUID> reportedReviewIds) {
        MovieReviewResponse response = new MovieReviewResponse();
        response.setUuid(review.getUuid());
        response.setMovieUuid(review.getMovieUuid());
        response.setUserUuid(review.getUserUuid());
        response.setRating(review.getRating());
        response.setComment(review.getComment());
        response.setVibeTags(ReviewVibeTagUtil.fromJson(review.getVibeTags()));
        response.setCreatedAt(review.getCreatedAt());
        response.setUpdatedAt(review.getUpdatedAt());
        response.setMine(currentUserUuid != null && currentUserUuid.equals(review.getUserUuid()));
        response.setReportedByMe(reportedReviewIds.contains(review.getUuid()));

        User user = usersById.get(review.getUserUuid());
        if (user != null) {
            response.setUserFullName(user.getFullName());
            response.setUserAvatarUrl(user.getAvatarUrl());
        }

        return response;
    }

    private String normalizeComment(String comment) {
        String normalized = ReviewTextModerationUtil.normalizeComment(comment);
        if (normalized == null) {
            return null;
        }
        ReviewTextModerationUtil.assertNoBannedWords(normalized, systemConfigService.getReviewBannedWords());
        return normalized;
    }

    private Map<String, Long> buildVibeTagCounts(UUID movieUuid) {
        List<String> rows = movieReviewRepository.findVibeTagsJsonByMovieUuidAndStatus(
                movieUuid, MovieReviewStatus.VISIBLE);
        return ReviewVibeTagUtil.aggregateTagCounts(rows);
    }
}
