package com.thdpv.movietheater.movie.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewRequest;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;
import com.thdpv.movietheater.movie.dto.response.MovieReviewResponse;
import com.thdpv.movietheater.movie.dto.response.MovieReviewSummaryResponse;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class MovieReviewService {

    private static final String REVIEW_ELIGIBILITY_MESSAGE =
            "Chi khach hang da mua ve rap hoac ve xem online moi co the danh gia phim nay.";

    private final MovieReviewRepository movieReviewRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final SystemConfigService systemConfigService;

    public MovieReviewService(
            MovieReviewRepository movieReviewRepository,
            MovieRepository movieRepository,
            UserRepository userRepository,
            BookingRepository bookingRepository,
            SystemConfigService systemConfigService) {
        this.movieReviewRepository = movieReviewRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.systemConfigService = systemConfigService;
    }

    @Transactional(readOnly = true)
    public Page<MovieReviewResponse> getReviews(UUID movieUuid, Pageable pageable, UUID currentUserUuid) {
        ensureMovieVisible(movieUuid);
        Pageable safePageable = PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                pageable.getPageSize() > 0 ? Math.min(pageable.getPageSize(), 50) : 10);

        Page<MovieReview> reviewPage = movieReviewRepository.findByMovieUuidAndStatusOrderByCreatedAtDesc(
                movieUuid, MovieReviewStatus.VISIBLE, safePageable);
        var content = reviewPage.getContent().stream()
                .map(review -> toResponse(review, currentUserUuid))
                .toList();
        return new PageImpl<>(content, safePageable, reviewPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public MovieReviewSummaryResponse getSummary(UUID movieUuid, UUID currentUserUuid) {
        ensureMovieVisible(movieUuid);

        MovieReviewSummaryResponse summary = new MovieReviewSummaryResponse();
        long total = movieReviewRepository.countByMovieUuidAndStatus(movieUuid, MovieReviewStatus.VISIBLE);
        summary.setTotalReviews(total);

        double average = total == 0
                ? 0
                : movieReviewRepository.averageRatingByMovieUuidAndStatus(movieUuid, MovieReviewStatus.VISIBLE);
        summary.setAverageRating(Math.round(average * 10.0) / 10.0);
        summary.setRatingDistribution(buildDistribution(movieUuid));

        if (currentUserUuid != null) {
            boolean hasPurchased = hasConfirmedPurchase(currentUserUuid, movieUuid);
            summary.setCanReview(hasPurchased);
            if (!hasPurchased) {
                summary.setReviewEligibilityMessage(REVIEW_ELIGIBILITY_MESSAGE);
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

        if (!hasConfirmedPurchase(user.getId(), movieUuid)) {
            throw new AppException(ErrorCode.REVIEW_PURCHASE_REQUIRED, REVIEW_ELIGIBILITY_MESSAGE);
        }

        String normalizedComment = normalizeComment(request.getComment());

        MovieReview review = new MovieReview();
        review.setMovieUuid(movieUuid);
        review.setUserUuid(user.getId());
        review.setRating(request.getRating());
        review.setComment(normalizedComment);
        review.setStatus(MovieReviewStatus.VISIBLE);

        MovieReview saved = movieReviewRepository.save(review);
        return toResponse(saved, user.getId());
    }

    @Transactional
    public void deleteMyReview(UUID movieUuid, UUID reviewUuid, String userEmail) {
        ensureMovieVisible(movieUuid);
        User user = getActiveUser(userEmail);
        MovieReview review = movieReviewRepository
                .findByUuidAndMovieUuidAndUserUuid(reviewUuid, movieUuid, user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));
        movieReviewRepository.delete(review);
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

    private Map<Integer, Long> buildDistribution(UUID movieUuid) {
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            distribution.put(star, 0L);
        }
        for (Object[] row : movieReviewRepository.countByRatingGroupAndStatus(movieUuid, MovieReviewStatus.VISIBLE)) {
            int rating = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (rating >= 1 && rating <= 5) {
                distribution.put(rating, count);
            }
        }
        return distribution;
    }

    private MovieReviewResponse toResponse(MovieReview review, UUID currentUserUuid) {
        MovieReviewResponse response = new MovieReviewResponse();
        response.setUuid(review.getUuid());
        response.setMovieUuid(review.getMovieUuid());
        response.setUserUuid(review.getUserUuid());
        response.setRating(review.getRating());
        response.setComment(review.getComment());
        response.setCreatedAt(review.getCreatedAt());
        response.setUpdatedAt(review.getUpdatedAt());
        response.setMine(currentUserUuid != null && currentUserUuid.equals(review.getUserUuid()));

        userRepository.findById(review.getUserUuid()).ifPresent(user -> {
            response.setUserFullName(user.getFullName());
            response.setUserAvatarUrl(user.getAvatarUrl());
        });

        return response;
    }

    private String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        assertNoBannedWords(trimmed);
        return trimmed;
    }

    private void assertNoBannedWords(String comment) {
        String lowered = comment.toLowerCase();
        for (String bannedWord : systemConfigService.getReviewBannedWords()) {
            if (bannedWord != null && !bannedWord.isBlank() && lowered.contains(bannedWord.trim().toLowerCase())) {
                throw new AppException(ErrorCode.REVIEW_BANNED_WORD);
            }
        }
    }
}
