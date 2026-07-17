package com.thdpv.movietheater.booking.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.request.AutoShowtimeSaveRequest;
import com.thdpv.movietheater.booking.dto.request.ShowtimeRequest;
import com.thdpv.movietheater.booking.dto.request.AutoShowtimeRequest;
import com.thdpv.movietheater.booking.dto.response.ShowtimeResponse;
import com.thdpv.movietheater.booking.dto.response.AutoShowtimePreviewResponse;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.service.ShowtimeService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    @PostMapping("/api/admin/showtimes")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHOWTIME_WRITE')")
    public ResponseEntity<ApiResponse<ShowtimeResponse>> createShowtime(
            @Valid @RequestBody ShowtimeRequest request) {
        ShowtimeResponse response = showtimeService.createShowtime(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/api/admin/showtimes/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHOWTIME_WRITE')")
    public ResponseEntity<ApiResponse<ShowtimeResponse>> updateShowtimeStatus(
            @PathVariable("id") UUID id,
            @RequestParam("status") ShowtimeStatus status) {
        ShowtimeResponse response = showtimeService.updateShowtimeStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/api/admin/showtimes")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHOWTIME_WRITE')")
    public ResponseEntity<ApiResponse<?>> getAdminShowtimes(
            @RequestParam(value = "unpaged", required = false, defaultValue = "true") boolean unpaged,
            @PageableDefault(size = 50, sort = "startTime", direction = Sort.Direction.DESC) Pageable pageable) {
        if (unpaged) {
            // Soft-capped list for filter UIs that still need the working set in memory.
            return ResponseEntity.ok(ApiResponse.success(showtimeService.getAdminShowtimes()));
        }
        Page<ShowtimeResponse> page = showtimeService.getAdminShowtimes(pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @PostMapping("/api/admin/showtimes/cleanup-drafts")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHOWTIME_WRITE')")
    public ResponseEntity<ApiResponse<Integer>> cleanupDraftShowtimes() {
        int cancelled = showtimeService.cancelAllDraftShowtimes();
        return ResponseEntity.ok(ApiResponse.success(cancelled, "Da huy " + cancelled + " suat chieu nhap (DRAFT)"));
    }

    @GetMapping("/api/showtimes")
    public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> getPublicShowtimes(
            @RequestParam(required = false) UUID cinemaUuid,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<ShowtimeResponse> response = showtimeService.getPublicShowtimes(cinemaUuid, date);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/api/admin/showtimes/auto-generate/preview")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHOWTIME_WRITE')")
    public ResponseEntity<ApiResponse<List<AutoShowtimePreviewResponse>>> getAutoShowtimesPreview(
            @Valid @RequestBody AutoShowtimeRequest request) {
        List<AutoShowtimePreviewResponse> response = showtimeService.getAutoShowtimesPreview(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/api/admin/showtimes/auto-generate/save")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('SHOWTIME_WRITE')")
    public ResponseEntity<ApiResponse<List<ShowtimeResponse>>> saveAutoShowtimes(
            @Valid @RequestBody AutoShowtimeSaveRequest request) {
        List<ShowtimeResponse> response = showtimeService.saveAutoShowtimes(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
