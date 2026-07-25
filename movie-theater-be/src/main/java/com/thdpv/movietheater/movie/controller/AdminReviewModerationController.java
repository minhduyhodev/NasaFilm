package com.thdpv.movietheater.movie.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.request.ResolveMovieReviewReportRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateReviewBannedWordsRequest;
import com.thdpv.movietheater.movie.dto.response.MovieReviewReportResponse;
import com.thdpv.movietheater.movie.service.MovieReviewModerationService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/review-moderation")
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class AdminReviewModerationController {

    private final MovieReviewModerationService movieReviewModerationService;
    private final UserRepository userRepository;

    public AdminReviewModerationController(
            MovieReviewModerationService movieReviewModerationService,
            UserRepository userRepository) {
        this.movieReviewModerationService = movieReviewModerationService;
        this.userRepository = userRepository;
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<Page<MovieReviewReportResponse>>> listReports(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "excludeStatus", required = false) String excludeStatus,
            @PageableDefault(page = 0, size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                movieReviewModerationService.listReports(status, excludeStatus, pageable)));
    }

    @GetMapping("/reports/pending-count")
    public ResponseEntity<ApiResponse<Long>> countPendingReports() {
        return ResponseEntity.ok(ApiResponse.success(movieReviewModerationService.countPendingReports()));
    }

    @PostMapping("/reports/{reportUuid}/resolve")
    public ResponseEntity<ApiResponse<MovieReviewReportResponse>> resolveReport(
            @PathVariable UUID reportUuid,
            @Valid @RequestBody ResolveMovieReviewReportRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID moderatorUuid = resolveUserUuid(userDetails);
        MovieReviewReportResponse response = movieReviewModerationService.resolveReport(
                reportUuid, request, moderatorUuid);
        return ResponseEntity.ok(ApiResponse.success(response, "Da xu ly don bao cao"));
    }

    @GetMapping("/banned-words")
    public ResponseEntity<ApiResponse<List<String>>> getBannedWords() {
        return ResponseEntity.ok(ApiResponse.success(movieReviewModerationService.getBannedWords()));
    }

    @PutMapping("/banned-words")
    public ResponseEntity<ApiResponse<List<String>>> updateBannedWords(
            @Valid @RequestBody UpdateReviewBannedWordsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                movieReviewModerationService.updateBannedWords(request.getWords()),
                "Da cap nhat danh sach tu cam"));
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
