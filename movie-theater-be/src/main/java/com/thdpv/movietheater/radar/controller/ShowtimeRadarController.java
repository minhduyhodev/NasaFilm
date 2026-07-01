package com.thdpv.movietheater.radar.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.radar.dto.request.UpdateShowtimeRadarRequest;
import com.thdpv.movietheater.radar.dto.response.ShowtimeRadarPreferenceResponse;
import com.thdpv.movietheater.radar.dto.response.ShowtimeRadarSuggestionResponse;
import com.thdpv.movietheater.radar.service.ShowtimeRadarService;

@RestController
@RequestMapping("/api/user/showtime-radar")
@PreAuthorize("isAuthenticated()")
public class ShowtimeRadarController {

    private final ShowtimeRadarService showtimeRadarService;

    public ShowtimeRadarController(ShowtimeRadarService showtimeRadarService) {
        this.showtimeRadarService = showtimeRadarService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ShowtimeRadarPreferenceResponse>> getPreference(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                showtimeRadarService.getPreference(userDetails.getUsername())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ShowtimeRadarPreferenceResponse>> updatePreference(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateShowtimeRadarRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                showtimeRadarService.updatePreference(userDetails.getUsername(), request),
                "Đã cập nhật Smart Showtime Radar"));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<ShowtimeRadarSuggestionResponse>>> getSuggestions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                showtimeRadarService.getSuggestions(userDetails.getUsername())));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> softDeletePreference(
            @AuthenticationPrincipal UserDetails userDetails) {
        showtimeRadarService.softDeletePreference(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa cài đặt Smart Showtime Radar"));
    }
}
