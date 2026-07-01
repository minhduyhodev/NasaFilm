package com.thdpv.movietheater.movie.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.request.CreateReviewVibeTagRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateReviewVibeTagRequest;
import com.thdpv.movietheater.movie.dto.response.AdminReviewVibeTagResponse;
import com.thdpv.movietheater.movie.service.ReviewVibeTagService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/review-vibe-tags")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewVibeTagController {

    private final ReviewVibeTagService reviewVibeTagService;

    public AdminReviewVibeTagController(ReviewVibeTagService reviewVibeTagService) {
        this.reviewVibeTagService = reviewVibeTagService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminReviewVibeTagResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.success(reviewVibeTagService.listAllAdmin()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminReviewVibeTagResponse>> create(
            @Valid @RequestBody CreateReviewVibeTagRequest request) {
        AdminReviewVibeTagResponse response = reviewVibeTagService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<ApiResponse<AdminReviewVibeTagResponse>> update(
            @PathVariable UUID uuid,
            @Valid @RequestBody UpdateReviewVibeTagRequest request) {
        return ResponseEntity.ok(ApiResponse.success(reviewVibeTagService.update(uuid, request)));
    }
}
