package com.thdpv.movietheater.discover.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.discover.dto.request.DiscoverMatchRequest;
import com.thdpv.movietheater.discover.dto.response.DiscoverConfigResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverMatchResponse;
import com.thdpv.movietheater.discover.service.DiscoverMatchService;
import com.thdpv.movietheater.discover.service.DiscoverQuizAdminService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/discover")
public class DiscoverController {

    private final DiscoverMatchService discoverMatchService;
    private final DiscoverQuizAdminService discoverQuizAdminService;

    public DiscoverController(
            DiscoverMatchService discoverMatchService,
            DiscoverQuizAdminService discoverQuizAdminService) {
        this.discoverMatchService = discoverMatchService;
        this.discoverQuizAdminService = discoverQuizAdminService;
    }

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<DiscoverConfigResponse>> getConfig() {
        return ResponseEntity.ok(ApiResponse.success(discoverQuizAdminService.getPublicConfig()));
    }

    @PostMapping("/match")
    public ResponseEntity<ApiResponse<DiscoverMatchResponse>> match(
            @Valid @RequestBody DiscoverMatchRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null || userDetails.getUsername().isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Vui lòng đăng nhập để dùng Movie Matchmaker");
        }
        return ResponseEntity.ok(ApiResponse.success(discoverMatchService.match(request, userDetails.getUsername())));
    }
}
