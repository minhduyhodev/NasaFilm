package com.thdpv.movietheater.movie.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.request.VodStatusBatchRequest;
import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.booking.dto.response.VodStatusResponse;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.service.MovieService;
import com.thdpv.movietheater.movie.support.VodStreamCookieSupport;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/vod")
@RequiredArgsConstructor
public class VodController {

    private final BookingService bookingService;
    private final MovieService movieService;

    @Value("${app.vod.stream-cookie.secure:false}")
    private boolean streamCookieSecure;

    @Value("${app.vod.stream-cookie.same-site:Lax}")
    private String streamCookieSameSite;

    @Value("${app.vod.stream-cookie.domain:}")
    private String streamCookieDomain;

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
        String rawStreamToken = response.getStreamToken();
        ResponseCookie streamCookie = VodStreamCookieSupport.create(
                rawStreamToken,
                response.getExpiresAt(),
                streamCookieSecure,
                streamCookieSameSite,
                streamCookieDomain);
        response.setStreamToken(null);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, streamCookie.toString())
                .body(ApiResponse.success(response));
    }

    @PostMapping("/heartbeat/{movieRef}")
    public ResponseEntity<ApiResponse<Void>> vodHeartbeat(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("movieRef") String movieRef,
            @RequestHeader(value = "X-Stream-Session", required = false) String streamSessionId,
            @RequestHeader(value = "X-Stream-Token", required = false) String streamTokenHeader,
            @RequestParam(value = "streamToken", required = false) String streamTokenQuery,
            @RequestParam(value = "positionSeconds", required = false) Integer positionSeconds,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds,
            HttpServletRequest request) {
        String streamToken = firstNonBlank(
                VodStreamCookieSupport.read(request),
                streamTokenHeader,
                streamTokenQuery);
        UUID movieUuid = movieService.resolveMovieUuid(movieRef);
        bookingService.vodHeartbeat(
                userDetails != null ? userDetails.getUsername() : null,
                movieUuid,
                streamToken,
                streamSessionId,
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

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
