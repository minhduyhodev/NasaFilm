package com.thdpv.movietheater.movie.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.booking.dto.response.VodStatusResponse;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/vod")
@RequiredArgsConstructor
public class VodController {

    private final BookingService bookingService;

    @GetMapping("/status/{movieUuid}")
    public ResponseEntity<ApiResponse<VodStatusResponse>> getVodStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieUuid") UUID movieUuid) {
        VodStatusResponse response = bookingService.getVodStatus(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/play/{movieUuid}")
    public ResponseEntity<ApiResponse<VodPlayResponse>> activateVodPlay(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieUuid") UUID movieUuid) {
        VodPlayResponse response = bookingService.activateVodPlay(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/heartbeat/{movieUuid}")
    public ResponseEntity<ApiResponse<Void>> vodHeartbeat(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieUuid") UUID movieUuid,
            @RequestParam("streamToken") String streamToken) {
        bookingService.vodHeartbeat(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid,
                streamToken);
        return ResponseEntity.ok(ApiResponse.success(null, "Heartbeat OK"));
    }
}
