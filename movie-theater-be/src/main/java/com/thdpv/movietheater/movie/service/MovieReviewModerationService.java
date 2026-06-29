package com.thdpv.movietheater.movie.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewReportRequest;
import com.thdpv.movietheater.movie.dto.request.ResolveMovieReviewReportRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateMovieReviewStatusRequest;
import com.thdpv.movietheater.movie.dto.response.AdminMovieReviewResponse;
import com.thdpv.movietheater.movie.dto.response.MovieReviewReportResponse;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.entity.MovieReviewReport;
import com.thdpv.movietheater.movie.enums.MovieReviewReportStatus;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewReportRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class MovieReviewModerationService {

    private final MovieReviewRepository movieReviewRepository;
    private final MovieReviewReportRepository movieReviewReportRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final SystemConfigService systemConfigService;

    public MovieReviewModerationService(
            MovieReviewRepository movieReviewRepository,
            MovieReviewReportRepository movieReviewReportRepository,
            MovieRepository movieRepository,
            UserRepository userRepository,
            SystemConfigService systemConfigService) {
        this.movieReviewRepository = movieReviewRepository;
        this.movieReviewReportRepository = movieReviewReportRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.systemConfigService = systemConfigService;
    }

    @Transactional
    public MovieReviewReportResponse createReport(
            UUID movieUuid,
            UUID reviewUuid,
            CreateMovieReviewReportRequest request,
            String reporterEmail) {
        User reporter = getActiveUser(reporterEmail);
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
        return toReportResponse(saved, review);
    }

    @Transactional(readOnly = true)
    public Page<MovieReviewReportResponse> listReports(String status, String excludeStatus, Pageable pageable) {
        MovieReviewReportStatus filterStatus = parseReportStatus(status);
        MovieReviewReportStatus filterExcludeStatus = parseReportStatus(excludeStatus);
        Pageable safePageable = sanitizePageable(pageable);
        Page<MovieReviewReport> page = movieReviewReportRepository.searchReports(
                filterStatus, filterExcludeStatus, safePageable);
        var content = page.getContent().stream()
                .map(report -> {
                    MovieReview review = movieReviewRepository.findById(report.getReviewUuid()).orElse(null);
                    return toReportResponse(report, review);
                })
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
        if ("HIDE_REVIEW".equals(action)) {
            review.setStatus(MovieReviewStatus.HIDDEN);
            review.setModeratedByUuid(moderatorUuid);
            review.setModeratedAt(OffsetDateTime.now());
            review.setModerationNote(request.getNote());
            movieReviewRepository.save(review);
            report.setStatus(MovieReviewReportStatus.RESOLVED);
        } else if ("DISMISS".equals(action)) {
            report.setStatus(MovieReviewReportStatus.REJECTED);
        } else {
            throw new AppException(ErrorCode.BAD_REQUEST, "Hanh dong xu ly khong hop le");
        }

        report.setResolvedByUuid(moderatorUuid);
        report.setResolvedAt(OffsetDateTime.now());
        report.setResolutionNote(request.getNote());

        MovieReviewReport saved = movieReviewReportRepository.save(report);
        return toReportResponse(saved, review);
    }

    @Transactional(readOnly = true)
    public Page<AdminMovieReviewResponse> listReviews(
            UUID movieUuid,
            String status,
            String query,
            Pageable pageable) {
        MovieReviewStatus filterStatus = parseReviewStatus(status);
        String normalizedQuery = query != null && !query.isBlank() ? query.trim() : null;
        Pageable safePageable = sanitizePageable(pageable);

        Page<MovieReview> page = movieReviewRepository.searchAdminReviews(
                movieUuid, filterStatus, normalizedQuery, safePageable);
        var content = page.getContent().stream()
                .map(this::toAdminReviewResponse)
                .toList();
        return new PageImpl<>(content, safePageable, page.getTotalElements());
    }

    @Transactional
    public AdminMovieReviewResponse updateReviewStatus(
            UUID reviewUuid,
            UpdateMovieReviewStatusRequest request,
            UUID moderatorUuid) {
        MovieReview review = movieReviewRepository.findById(reviewUuid)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));

        MovieReviewStatus nextStatus = MovieReviewStatus.valueOf(request.getStatus().trim().toUpperCase());
        review.setStatus(nextStatus);
        review.setModeratedByUuid(moderatorUuid);
        review.setModeratedAt(OffsetDateTime.now());
        review.setModerationNote(request.getNote());

        MovieReview saved = movieReviewRepository.save(review);
        return toAdminReviewResponse(saved);
    }

    @Transactional
    public void deleteReview(UUID reviewUuid) {
        if (!movieReviewRepository.existsById(reviewUuid)) {
            throw new AppException(ErrorCode.REVIEW_NOT_FOUND);
        }
        movieReviewRepository.deleteById(reviewUuid);
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

    private MovieReviewStatus parseReviewStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return MovieReviewStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai danh gia khong hop le");
        }
    }

    private AdminMovieReviewResponse toAdminReviewResponse(MovieReview review) {
        AdminMovieReviewResponse response = new AdminMovieReviewResponse();
        response.setUuid(review.getUuid());
        response.setMovieUuid(review.getMovieUuid());
        response.setUserUuid(review.getUserUuid());
        response.setRating(review.getRating());
        response.setComment(review.getComment());
        response.setStatus(review.getStatus());
        response.setModerationNote(review.getModerationNote());
        response.setCreatedAt(review.getCreatedAt());
        response.setUpdatedAt(review.getUpdatedAt());
        response.setReportCount(movieReviewReportRepository.countByReviewUuid(review.getUuid()));

        movieRepository.findById(review.getMovieUuid()).ifPresent(movie -> response.setMovieTitle(movie.getTitle()));
        userRepository.findById(review.getUserUuid()).ifPresent(user -> {
            response.setUserFullName(user.getFullName());
            response.setUserAvatarUrl(user.getAvatarUrl());
        });

        return response;
    }

    private MovieReviewReportResponse toReportResponse(MovieReviewReport report, MovieReview review) {
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

        userRepository.findById(report.getReporterUuid()).ifPresent(user ->
                response.setReporterFullName(user.getFullName()));

        if (report.getResolvedByUuid() != null) {
            userRepository.findById(report.getResolvedByUuid()).ifPresent(user ->
                    response.setResolvedByFullName(user.getFullName()));
        }

        if (review != null) {
            response.setMovieUuid(review.getMovieUuid());
            response.setReviewUserUuid(review.getUserUuid());
            response.setReviewRating(review.getRating());
            response.setReviewComment(review.getComment());

            movieRepository.findById(review.getMovieUuid()).ifPresent(movie ->
                    response.setMovieTitle(movie.getTitle()));
            userRepository.findById(review.getUserUuid()).ifPresent(user ->
                    response.setReviewUserFullName(user.getFullName()));
        }

        return response;
    }
}
