package com.thdpv.movietheater.movie.service;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.ReviewModerationRealtimeBroadcaster;
import com.thdpv.movietheater.config.cache.MovieReviewCacheEvictor;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewReportRequest;
import com.thdpv.movietheater.movie.dto.request.ResolveMovieReviewReportRequest;
import com.thdpv.movietheater.movie.dto.response.MovieReviewReportResponse;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.entity.MovieReviewReport;
import com.thdpv.movietheater.movie.enums.MovieReviewReportStatus;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewReportRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.movie.support.ReviewActionRateLimiter;
import com.thdpv.movietheater.movie.util.ReviewVibeTagUtil;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class MovieReviewModerationService {

    private final MovieReviewRepository movieReviewRepository;
    private final MovieReviewReportRepository movieReviewReportRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final SystemConfigService systemConfigService;
    private final MovieReviewCacheEvictor movieReviewCacheEvictor;
    private final ReviewActionRateLimiter reviewActionRateLimiter;
    private final ReviewModerationRealtimeBroadcaster reviewModerationRealtimeBroadcaster;
    private final int autoHideReportThreshold;

    public MovieReviewModerationService(
            MovieReviewRepository movieReviewRepository,
            MovieReviewReportRepository movieReviewReportRepository,
            MovieRepository movieRepository,
            UserRepository userRepository,
            SystemConfigService systemConfigService,
            MovieReviewCacheEvictor movieReviewCacheEvictor,
            ReviewActionRateLimiter reviewActionRateLimiter,
            ReviewModerationRealtimeBroadcaster reviewModerationRealtimeBroadcaster,
            @Value("${app.review.auto-hide-report-threshold:3}") int autoHideReportThreshold) {
        this.movieReviewRepository = movieReviewRepository;
        this.movieReviewReportRepository = movieReviewReportRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.systemConfigService = systemConfigService;
        this.movieReviewCacheEvictor = movieReviewCacheEvictor;
        this.reviewActionRateLimiter = reviewActionRateLimiter;
        this.reviewModerationRealtimeBroadcaster = reviewModerationRealtimeBroadcaster;
        this.autoHideReportThreshold = Math.max(autoHideReportThreshold, 1);
    }

    @Transactional
    public MovieReviewReportResponse createReport(
            UUID movieUuid,
            UUID reviewUuid,
            CreateMovieReviewReportRequest request,
            String reporterEmail) {
        User reporter = getActiveUser(reporterEmail);
        reviewActionRateLimiter.assertReportAllowed(reporter.getId().toString());
        MovieReview review = getReviewForMovie(movieUuid, reviewUuid);

        if (review.getUserUuid().equals(reporter.getId())) {
            throw new AppException(ErrorCode.CANNOT_REPORT_OWN_REVIEW);
        }

        if (movieReviewReportRepository.existsByReviewUuidAndReporterUuid(reviewUuid, reporter.getId())) {
            throw new AppException(ErrorCode.REVIEW_ALREADY_REPORTED);
        }

        MovieReviewReport report = new MovieReviewReport();
        report.setReviewUuid(reviewUuid);
        report.setReporterUuid(reporter.getId());
        report.setReason(request.getReason().trim());
        report.setStatus(MovieReviewReportStatus.PENDING);

        MovieReviewReport saved = movieReviewReportRepository.save(report);
        Map<UUID, User> usersById = new java.util.HashMap<>();
        usersById.put(reporter.getId(), reporter);
        userRepository.findById(review.getUserUuid()).ifPresent(user -> usersById.put(user.getId(), user));
        Map<UUID, Movie> moviesById = movieRepository.findById(review.getMovieUuid())
                .map(movie -> Map.of(movie.getUuid(), movie))
                .orElse(Map.of());

        maybeAutoHideReview(review);
        reviewModerationRealtimeBroadcaster.publish("REPORT_CREATED");

        return toReportResponse(saved, review, usersById, moviesById);
    }

    @Transactional(readOnly = true)
    public Page<MovieReviewReportResponse> listReports(String status, String excludeStatus, Pageable pageable) {
        MovieReviewReportStatus filterStatus = parseReportStatus(status);
        MovieReviewReportStatus filterExcludeStatus = parseReportStatus(excludeStatus);
        Pageable safePageable = sanitizePageable(pageable);
        Page<MovieReviewReport> page = movieReviewReportRepository.searchReports(
                filterStatus, filterExcludeStatus, safePageable);

        List<MovieReviewReport> reports = page.getContent();
        if (reports.isEmpty()) {
            return new PageImpl<>(List.of(), safePageable, page.getTotalElements());
        }

        Set<UUID> reviewUuids = reports.stream()
                .map(MovieReviewReport::getReviewUuid)
                .collect(Collectors.toSet());
        Map<UUID, MovieReview> reviewsById = movieReviewRepository.findAllById(reviewUuids).stream()
                .collect(Collectors.toMap(MovieReview::getUuid, Function.identity()));

        Set<UUID> movieUuids = reviewsById.values().stream()
                .map(MovieReview::getMovieUuid)
                .collect(Collectors.toSet());
        Map<UUID, Movie> moviesById = movieRepository.findAllById(movieUuids).stream()
                .collect(Collectors.toMap(Movie::getUuid, Function.identity()));

        Set<UUID> userUuids = new HashSet<>();
        for (MovieReviewReport report : reports) {
            userUuids.add(report.getReporterUuid());
            if (report.getResolvedByUuid() != null) {
                userUuids.add(report.getResolvedByUuid());
            }
            MovieReview review = reviewsById.get(report.getReviewUuid());
            if (review != null) {
                userUuids.add(review.getUserUuid());
            }
        }
        Map<UUID, User> usersById = userRepository.findAllById(userUuids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        var content = reports.stream()
                .map(report -> toReportResponse(
                        report,
                        reviewsById.get(report.getReviewUuid()),
                        usersById,
                        moviesById))
                .toList();
        return new PageImpl<>(content, safePageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public long countPendingReports() {
        return movieReviewReportRepository.countByStatus(MovieReviewReportStatus.PENDING);
    }

    @Transactional
    public MovieReviewReportResponse resolveReport(
            UUID reportUuid,
            ResolveMovieReviewReportRequest request,
            UUID moderatorUuid) {
        MovieReviewReport report = movieReviewReportRepository.findById(reportUuid)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_REPORT_NOT_FOUND));

        if (report.getStatus() != MovieReviewReportStatus.PENDING) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Don bao cao da duoc xu ly");
        }

        MovieReview review = movieReviewRepository.findById(report.getReviewUuid())
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));

        String action = request.getAction().trim().toUpperCase();
        OffsetDateTime now = OffsetDateTime.now();
        if ("HIDE_REVIEW".equals(action)) {
            review.setStatus(MovieReviewStatus.HIDDEN);
            review.setModeratedByUuid(moderatorUuid);
            review.setModeratedAt(now);
            review.setModerationNote(request.getNote());
            movieReviewRepository.save(review);
            movieReviewCacheEvictor.evictSummary(review.getMovieUuid());

            List<MovieReviewReport> pendingReports = movieReviewReportRepository.findByReviewUuidAndStatus(
                    review.getUuid(), MovieReviewReportStatus.PENDING);
            for (MovieReviewReport pending : pendingReports) {
                pending.setStatus(MovieReviewReportStatus.RESOLVED);
                pending.setResolvedByUuid(moderatorUuid);
                pending.setResolvedAt(now);
                if (pending.getUuid().equals(reportUuid)) {
                    pending.setResolutionNote(request.getNote());
                }
            }
            movieReviewReportRepository.saveAll(pendingReports);
            MovieReviewReport resolved = pendingReports.stream()
                    .filter(item -> item.getUuid().equals(reportUuid))
                    .findFirst()
                    .orElse(report);
            reviewModerationRealtimeBroadcaster.publish("REVIEW_HIDDEN");
            return toReportResponse(resolved, review, Map.of(), Map.of());
        } else if ("DISMISS".equals(action)) {
            report.setStatus(MovieReviewReportStatus.REJECTED);
        } else {
            throw new AppException(ErrorCode.BAD_REQUEST, "Hanh dong xu ly khong hop le");
        }

        report.setResolvedByUuid(moderatorUuid);
        report.setResolvedAt(now);
        report.setResolutionNote(request.getNote());

        MovieReviewReport saved = movieReviewReportRepository.save(report);
        reviewModerationRealtimeBroadcaster.publish("REPORT_RESOLVED");
        return toReportResponse(saved, review, Map.of(), Map.of());
    }

    @Transactional(readOnly = true)
    public List<String> getBannedWords() {
        return systemConfigService.getReviewBannedWords();
    }

    @Transactional
    public List<String> updateBannedWords(List<String> words) {
        return systemConfigService.updateReviewBannedWords(words);
    }

    private MovieReview getReviewForMovie(UUID movieUuid, UUID reviewUuid) {
        MovieReview review = movieReviewRepository.findById(reviewUuid)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));
        if (!review.getMovieUuid().equals(movieUuid)) {
            throw new AppException(ErrorCode.REVIEW_NOT_FOUND);
        }
        if (review.getStatus() != MovieReviewStatus.VISIBLE) {
            throw new AppException(ErrorCode.REVIEW_NOT_FOUND);
        }
        return review;
    }

    private void maybeAutoHideReview(MovieReview review) {
        long pendingCount = movieReviewReportRepository.countByReviewUuidAndStatus(
                review.getUuid(), MovieReviewReportStatus.PENDING);
        if (pendingCount < autoHideReportThreshold) {
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        String autoNote = "Tu dong an sau " + pendingCount + " bao cao";
        review.setStatus(MovieReviewStatus.HIDDEN);
        review.setModeratedAt(now);
        review.setModerationNote(autoNote);
        movieReviewRepository.save(review);
        movieReviewCacheEvictor.evictSummary(review.getMovieUuid());

        List<MovieReviewReport> pendingReports = movieReviewReportRepository.findByReviewUuidAndStatus(
                review.getUuid(), MovieReviewReportStatus.PENDING);
        for (MovieReviewReport pending : pendingReports) {
            pending.setStatus(MovieReviewReportStatus.RESOLVED);
            pending.setResolvedAt(now);
            pending.setResolutionNote(autoNote);
        }
        movieReviewReportRepository.saveAll(pendingReports);
        reviewModerationRealtimeBroadcaster.publish("REVIEW_AUTO_HIDDEN");
    }

    private User getActiveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private Pageable sanitizePageable(Pageable pageable) {
        return PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                pageable.getPageSize() > 0 ? Math.min(pageable.getPageSize(), 50) : 10);
    }

    private MovieReviewReportStatus parseReportStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return MovieReviewReportStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai bao cao khong hop le");
        }
    }

    private MovieReviewReportResponse toReportResponse(
            MovieReviewReport report,
            MovieReview review,
            Map<UUID, User> usersById,
            Map<UUID, Movie> moviesById) {
        MovieReviewReportResponse response = new MovieReviewReportResponse();
        response.setUuid(report.getUuid());
        response.setReviewUuid(report.getReviewUuid());
        response.setReporterUuid(report.getReporterUuid());
        response.setReason(report.getReason());
        response.setStatus(report.getStatus());
        response.setResolutionNote(report.getResolutionNote());
        response.setResolvedByUuid(report.getResolvedByUuid());
        response.setResolvedAt(report.getResolvedAt());
        response.setCreatedAt(report.getCreatedAt());

        User reporter = usersById.get(report.getReporterUuid());
        if (reporter == null && report.getReporterUuid() != null) {
            reporter = userRepository.findById(report.getReporterUuid()).orElse(null);
        }
        if (reporter != null) {
            response.setReporterFullName(reporter.getFullName());
        }

        if (report.getResolvedByUuid() != null) {
            User resolver = usersById.get(report.getResolvedByUuid());
            if (resolver == null) {
                resolver = userRepository.findById(report.getResolvedByUuid()).orElse(null);
            }
            if (resolver != null) {
                response.setResolvedByFullName(resolver.getFullName());
            }
        }

        if (review != null) {
            response.setMovieUuid(review.getMovieUuid());
            response.setReviewUserUuid(review.getUserUuid());
            response.setReviewRating(review.getRating());
            response.setReviewComment(review.getComment());
            response.setReviewVibeTags(ReviewVibeTagUtil.fromJson(review.getVibeTags()));

            Movie movie = moviesById.get(review.getMovieUuid());
            if (movie == null) {
                movie = movieRepository.findById(review.getMovieUuid()).orElse(null);
            }
            if (movie != null) {
                response.setMovieTitle(movie.getTitle());
            }

            User reviewUser = usersById.get(review.getUserUuid());
            if (reviewUser == null) {
                reviewUser = userRepository.findById(review.getUserUuid()).orElse(null);
            }
            if (reviewUser != null) {
                response.setReviewUserFullName(reviewUser.getFullName());
            }
        }

        return response;
    }
}
