package com.thdpv.movietheater.discover.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverAnalyticsResponse;
import com.thdpv.movietheater.discover.service.DiscoverHistoryService;

@RestController
@RequestMapping("/api/admin/discover")
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class AdminDiscoverController {

    private final DiscoverHistoryService discoverHistoryService;

    public AdminDiscoverController(DiscoverHistoryService discoverHistoryService) {
        this.discoverHistoryService = discoverHistoryService;
    }

    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<AdminDiscoverAnalyticsResponse>> getAnalytics() {
        return ResponseEntity.ok(ApiResponse.success(discoverHistoryService.getAdminAnalytics()));
    }
}
