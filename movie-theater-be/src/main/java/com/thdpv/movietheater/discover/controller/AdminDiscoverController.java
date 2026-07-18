package com.thdpv.movietheater.discover.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.discover.dto.request.AdminDiscoverQuizOptionRequest;
import com.thdpv.movietheater.discover.dto.request.AdminDiscoverQuizSettingsRequest;
import com.thdpv.movietheater.discover.dto.request.AdminDiscoverSuggestionRequest;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverAnalyticsResponse;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverQuizConfigResponse;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverSuggestionResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverQuizOptionResponse;
import com.thdpv.movietheater.discover.service.DiscoverHistoryService;
import com.thdpv.movietheater.discover.service.DiscoverQuizAdminService;
import com.thdpv.movietheater.discover.service.DiscoverSuggestionAdminService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/discover")
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class AdminDiscoverController {

    private final DiscoverHistoryService discoverHistoryService;
    private final DiscoverQuizAdminService discoverQuizAdminService;
    private final DiscoverSuggestionAdminService discoverSuggestionAdminService;

    public AdminDiscoverController(
            DiscoverHistoryService discoverHistoryService,
            DiscoverQuizAdminService discoverQuizAdminService,
            DiscoverSuggestionAdminService discoverSuggestionAdminService) {
        this.discoverHistoryService = discoverHistoryService;
        this.discoverQuizAdminService = discoverQuizAdminService;
        this.discoverSuggestionAdminService = discoverSuggestionAdminService;
    }

    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<AdminDiscoverAnalyticsResponse>> getAnalytics() {
        return ResponseEntity.ok(ApiResponse.success(discoverHistoryService.getAdminAnalytics()));
    }

    @GetMapping("/quiz-config")
    public ResponseEntity<ApiResponse<AdminDiscoverQuizConfigResponse>> getQuizConfig() {
        return ResponseEntity.ok(ApiResponse.success(discoverQuizAdminService.getAdminConfig()));
    }

    @PutMapping("/quiz-settings")
    public ResponseEntity<ApiResponse<AdminDiscoverQuizConfigResponse>> updateQuizSettings(
            @Valid @RequestBody AdminDiscoverQuizSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                discoverQuizAdminService.updateSettings(request),
                "Đã cập nhật cấu hình quiz"));
    }

    @PostMapping("/quiz-options")
    public ResponseEntity<ApiResponse<DiscoverQuizOptionResponse>> createQuizOption(
            @Valid @RequestBody AdminDiscoverQuizOptionRequest request) {
        request.setUuid(null);
        return ResponseEntity.ok(ApiResponse.success(
                discoverQuizAdminService.upsertOption(request),
                "Đã tạo lựa chọn quiz"));
    }

    @PutMapping("/quiz-options/{uuid}")
    public ResponseEntity<ApiResponse<DiscoverQuizOptionResponse>> updateQuizOption(
            @PathVariable UUID uuid,
            @Valid @RequestBody AdminDiscoverQuizOptionRequest request) {
        request.setUuid(uuid);
        return ResponseEntity.ok(ApiResponse.success(
                discoverQuizAdminService.upsertOption(request),
                "Đã cập nhật lựa chọn quiz"));
    }

    @DeleteMapping("/quiz-options/{uuid}")
    public ResponseEntity<ApiResponse<Void>> deleteQuizOption(@PathVariable UUID uuid) {
        discoverQuizAdminService.deleteOption(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa lựa chọn quiz"));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<AdminDiscoverSuggestionResponse>>> listSuggestions(
            @RequestParam(required = false) String mood,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(ApiResponse.success(
                discoverSuggestionAdminService.listSuggestions(mood, active)));
    }

    @PostMapping("/suggestions")
    public ResponseEntity<ApiResponse<AdminDiscoverSuggestionResponse>> createSuggestion(
            @Valid @RequestBody AdminDiscoverSuggestionRequest request) {
        request.setUuid(null);
        return ResponseEntity.ok(ApiResponse.success(
                discoverSuggestionAdminService.upsertSuggestion(request),
                "Đã tạo gợi ý phim"));
    }

    @PutMapping("/suggestions/{uuid}")
    public ResponseEntity<ApiResponse<AdminDiscoverSuggestionResponse>> updateSuggestion(
            @PathVariable UUID uuid,
            @Valid @RequestBody AdminDiscoverSuggestionRequest request) {
        request.setUuid(uuid);
        return ResponseEntity.ok(ApiResponse.success(
                discoverSuggestionAdminService.upsertSuggestion(request),
                "Đã cập nhật gợi ý phim"));
    }

    @DeleteMapping("/suggestions/{uuid}")
    public ResponseEntity<ApiResponse<Void>> deleteSuggestion(@PathVariable UUID uuid) {
        discoverSuggestionAdminService.deleteSuggestion(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa gợi ý phim"));
    }
}
