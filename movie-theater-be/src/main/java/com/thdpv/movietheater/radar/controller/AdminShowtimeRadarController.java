package com.thdpv.movietheater.radar.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.radar.dto.request.UpdateShowtimeRadarRequest;
import com.thdpv.movietheater.radar.dto.response.AdminShowtimeRadarPreferenceResponse;
import com.thdpv.movietheater.radar.service.AdminShowtimeRadarService;

@RestController
@RequestMapping("/api/admin/showtime-radar/preferences")
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class AdminShowtimeRadarController {

    private final AdminShowtimeRadarService adminShowtimeRadarService;

    public AdminShowtimeRadarController(AdminShowtimeRadarService adminShowtimeRadarService) {
        this.adminShowtimeRadarService = adminShowtimeRadarService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminShowtimeRadarPreferenceResponse>>> listPreferences(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "enabled", required = false) Boolean enabled) {
        return ResponseEntity.ok(ApiResponse.success(adminShowtimeRadarService.listPreferences(query, enabled)));
    }

    @GetMapping("/{userUuid}")
    public ResponseEntity<ApiResponse<AdminShowtimeRadarPreferenceResponse>> getPreference(
            @PathVariable UUID userUuid) {
        return ResponseEntity.ok(ApiResponse.success(adminShowtimeRadarService.getPreference(userUuid)));
    }

    @PutMapping("/{userUuid}")
    public ResponseEntity<ApiResponse<AdminShowtimeRadarPreferenceResponse>> updatePreference(
            @PathVariable UUID userUuid,
            @RequestBody UpdateShowtimeRadarRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminShowtimeRadarService.updatePreference(userUuid, request),
                "Đã cập nhật sở thích Smart Showtime Radar"));
    }

    @DeleteMapping("/{userUuid}")
    public ResponseEntity<ApiResponse<Void>> deletePreference(@PathVariable UUID userUuid) {
        adminShowtimeRadarService.deletePreference(userUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa sở thích Smart Showtime Radar"));
    }
}
