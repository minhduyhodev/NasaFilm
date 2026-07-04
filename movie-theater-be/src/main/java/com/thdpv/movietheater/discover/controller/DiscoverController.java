package com.thdpv.movietheater.discover.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.discover.dto.request.DiscoverMatchRequest;
import com.thdpv.movietheater.discover.dto.response.DiscoverConfigResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverMatchResponse;
import com.thdpv.movietheater.discover.service.DiscoverMatchService;
import com.thdpv.movietheater.discover.support.DiscoverQuizConfig;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/discover")
public class DiscoverController {

    private final DiscoverMatchService discoverMatchService;

    public DiscoverController(DiscoverMatchService discoverMatchService) {
        this.discoverMatchService = discoverMatchService;
    }

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<DiscoverConfigResponse>> getConfig() {
        return ResponseEntity.ok(ApiResponse.success(DiscoverQuizConfig.toResponse()));
    }

    @PostMapping("/match")
    public ResponseEntity<ApiResponse<DiscoverMatchResponse>> match(
            @Valid @RequestBody DiscoverMatchRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(ApiResponse.success(discoverMatchService.match(request, email)));
    }
}
