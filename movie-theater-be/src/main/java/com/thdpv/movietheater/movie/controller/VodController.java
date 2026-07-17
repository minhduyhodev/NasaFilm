package com.thdpv.movietheater.movie.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.request.VodStatusBatchRequest;
import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.booking.dto.response.VodStatusResponse;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.service.MovieService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/vod")
@RequiredArgsConstructor
public class VodController {

    private final BookingService bookingService;
    private final MovieService movieService;

    @GetMapping("/status/{movieRef}")
    public ResponseEntity<ApiResponse<VodStatusResponse>> getVodStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieRef") String movieRef) {
        UUID movieUuid = movieService.resolveMovieUuid(movieRef);
        VodStatusResponse response = bookingService.getVodStatus(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/status/batch")
    public ResponseEntity<ApiResponse<Map<UUID, VodStatusResponse>>> getVodStatusBatch(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VodStatusBatchRequest request) {
        Map<UUID, VodStatusResponse> response = bookingService.getVodStatusBatch(
                userDetails != null ? userDetails.getUsername() : null,
                request.getMovieUuids());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/play/{movieRef}")
    public ResponseEntity<ApiResponse<VodPlayResponse>> activateVodPlay(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieRef") String movieRef,
            @RequestParam(value = "bookingUuid", required = false) UUID bookingUuid) {
        UUID movieUuid = movieService.resolveMovieUuid(movieRef);
        VodPlayResponse response = bookingService.activateVodPlay(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid,
                bookingUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/heartbeat/{movieRef}")
    public ResponseEntity<ApiResponse<Void>> vodHeartbeat(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieRef") String movieRef,
            @RequestParam("streamToken") String streamToken,
            @RequestParam(value = "positionSeconds", required = false) Integer positionSeconds,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds) {
        UUID movieUuid = movieService.resolveMovieUuid(movieRef);
        bookingService.vodHeartbeat(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid,
                streamToken,
                positionSeconds,
                durationSeconds);
        return ResponseEntity.ok(ApiResponse.success(null, "Heartbeat OK"));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<java.util.List<com.thdpv.movietheater.booking.dto.response.VodHistoryItemResponse>>> getVodHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.getVodWatchHistory(
                        userDetails != null ? userDetails.getUsername() : null)));
    }

    @PostMapping("/resend-ticket/{movieRef}")
    public ResponseEntity<ApiResponse<Void>> resendVodTicket(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieRef") String movieRef) {
        UUID movieUuid = movieService.resolveMovieUuid(movieRef);
        bookingService.resendVodTicketEmail(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Mã vé đã được gửi tới email của bạn"));
    }
}
