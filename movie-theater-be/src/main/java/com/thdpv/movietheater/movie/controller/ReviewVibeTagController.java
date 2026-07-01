package com.thdpv.movietheater.movie.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.response.ReviewVibeTagResponse;
import com.thdpv.movietheater.movie.service.ReviewVibeTagCatalogService;

@RestController
@RequestMapping("/api/review-vibe-tags")
public class ReviewVibeTagController {

    private final ReviewVibeTagCatalogService reviewVibeTagCatalogService;

    public ReviewVibeTagController(ReviewVibeTagCatalogService reviewVibeTagCatalogService) {
        this.reviewVibeTagCatalogService = reviewVibeTagCatalogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewVibeTagResponse>>> listTags() {
        return ResponseEntity.ok(ApiResponse.success(reviewVibeTagCatalogService.listAll()));
    }
}
