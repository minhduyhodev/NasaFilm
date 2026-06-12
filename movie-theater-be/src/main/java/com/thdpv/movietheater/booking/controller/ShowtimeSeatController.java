package com.thdpv.movietheater.booking.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.request.SyncSeatLockRequest;
import com.thdpv.movietheater.booking.dto.response.SeatLockSyncResponse;
import com.thdpv.movietheater.booking.dto.response.ShowtimeSeatMapResponse;
import com.thdpv.movietheater.booking.service.ShowtimeSeatService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
public class ShowtimeSeatController {

    private final ShowtimeSeatService showtimeSeatService;

    @GetMapping("/{showtimeUuid}/seat-map")
    public ResponseEntity<ApiResponse<ShowtimeSeatMapResponse>> getSeatMap(
            @PathVariable UUID showtimeUuid,
            @RequestParam(required = false) List<UUID> selectedSeatUuids,
            @AuthenticationPrincipal UserDetails userDetails) {
        ShowtimeSeatMapResponse response = showtimeSeatService.getSeatMap(
                showtimeUuid,
                selectedSeatUuids,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/locks")
    public ResponseEntity<ApiResponse<SeatLockSyncResponse>> syncSeatLocks(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SyncSeatLockRequest request) {
        SeatLockSyncResponse response = showtimeSeatService.syncSeatLocks(
                userDetails != null ? userDetails.getUsername() : null,
                request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
