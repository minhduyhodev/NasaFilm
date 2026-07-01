package com.thdpv.movietheater.movie.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewReportRequest;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewRequest;
import com.thdpv.movietheater.movie.dto.response.MovieReviewReportResponse;
import com.thdpv.movietheater.movie.dto.response.MovieReviewResponse;
import com.thdpv.movietheater.movie.dto.response.MovieReviewSummaryResponse;
import com.thdpv.movietheater.movie.service.MovieReviewModerationService;
import com.thdpv.movietheater.movie.service.MovieReviewService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/movies/{movieUuid}/reviews")
public class MovieReviewController {

    private final MovieReviewService movieReviewService;
    private final MovieReviewModerationService movieReviewModerationService;
    private final UserRepository userRepository;

    public MovieReviewController(
            MovieReviewService movieReviewService,
            MovieReviewModerationService movieReviewModerationService,
            UserRepository userRepository) {
        this.movieReviewService = movieReviewService;
        this.movieReviewModerationService = movieReviewModerationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<MovieReviewResponse>>> getReviews(
            @PathVariable UUID movieUuid,
            @RequestParam(value = "onlyWithComment", defaultValue = "false") boolean onlyWithComment,
            @RequestParam(value = "vibeTag", required = false) String vibeTag,
            @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID currentUserUuid = resolveUserUuid(userDetails);
        Page<MovieReviewResponse> page = movieReviewService.getReviews(
                movieUuid, pageable, currentUserUuid, onlyWithComment, vibeTag);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<MovieReviewSummaryResponse>> getSummary(
            @PathVariable UUID movieUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID currentUserUuid = resolveUserUuid(userDetails);
        MovieReviewSummaryResponse summary = movieReviewService.getSummary(movieUuid, currentUserUuid);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MovieReviewResponse>> createReview(
            @PathVariable UUID movieUuid,
            @Valid @RequestBody CreateMovieReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        MovieReviewResponse response = movieReviewService.createReview(movieUuid, request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @DeleteMapping("/{reviewUuid}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteMyReview(
            @PathVariable UUID movieUuid,
            @PathVariable UUID reviewUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        movieReviewService.deleteMyReview(movieUuid, reviewUuid, email);
        return ResponseEntity.ok(ApiResponse.success(null, "Da xoa danh gia cua ban"));
    }

    @PostMapping("/{reviewUuid}/report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MovieReviewReportResponse>> reportReview(
            @PathVariable UUID movieUuid,
            @PathVariable UUID reviewUuid,
            @Valid @RequestBody CreateMovieReviewReportRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        MovieReviewReportResponse response = movieReviewModerationService.createReport(
                movieUuid, reviewUuid, request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    private UUID resolveUserUuid(UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .map(User::getId)
                .orElse(null);
    }
}
