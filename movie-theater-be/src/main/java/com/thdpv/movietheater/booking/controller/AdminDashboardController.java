package com.thdpv.movietheater.booking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.response.AdminDashboardResponse;
import com.thdpv.movietheater.booking.dto.response.RevenueSeriesResponse;
import com.thdpv.movietheater.booking.service.AdminDashboardService;
import com.thdpv.movietheater.common.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('REPORT_VIEW')")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboardStats() {
        AdminDashboardResponse response = adminDashboardService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/revenue-series")
    public ResponseEntity<ApiResponse<RevenueSeriesResponse>> getRevenueSeries(
            @RequestParam(defaultValue = "day") String granularity,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(ApiResponse.success(
                adminDashboardService.getRevenueSeries(granularity, offset, date)));
    }
}
