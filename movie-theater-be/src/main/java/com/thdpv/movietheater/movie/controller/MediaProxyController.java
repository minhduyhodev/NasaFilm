package com.thdpv.movietheater.movie.controller;

import java.util.Locale;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.response.TmdbStatusResponse;
import com.thdpv.movietheater.movie.service.ImageProxyService;
import com.thdpv.movietheater.movie.service.MediaS3Service;
import com.thdpv.movietheater.movie.service.MediaSecurityService;
import com.thdpv.movietheater.movie.support.MediaProxyRateLimiter;
import com.thdpv.movietheater.movie.support.VodStreamCookieSupport;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaProxyController {

    private final MediaProxyRateLimiter mediaProxyRateLimiter;
    private final MediaSecurityService mediaSecurityService;
    private final MediaS3Service mediaS3Service;
    private final ImageProxyService imageProxyService;

    @GetMapping("/tmdb-status")
    public ResponseEntity<ApiResponse<TmdbStatusResponse>> tmdbStatus() {
        return ResponseEntity.ok(ApiResponse.success(new TmdbStatusResponse(imageProxyService.isTmdbReachable())));
    }

    @GetMapping("/border")
    public ResponseEntity<Void> borderRedirect(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String url,
            HttpServletRequest request) {
        mediaProxyRateLimiter.assertBorderAllowed(request);
        String resolvedKey = key;
        if (resolvedKey == null || resolvedKey.isBlank()) {
            resolvedKey = S3MediaBorderUtils.extractS3Key(url, mediaS3Service.getS3BucketHost());
        } else {
            resolvedKey = S3MediaBorderUtils.sanitizeKey(resolvedKey);
        }

        if (resolvedKey != null && resolvedKey.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return mediaS3Service.getPresignedRedirect(resolvedKey);
    }

    @GetMapping("/stream")
    public ResponseEntity<StreamingResponseBody> streamMedia(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String url,
            @RequestParam(required = false) String token,
            @RequestHeader(value = "X-Stream-Token", required = false) String tokenHeader,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader,
            HttpServletRequest request) {
        String cookieToken = VodStreamCookieSupport.read(request);
        String resolvedToken = firstNonBlank(cookieToken, tokenHeader, token);
        mediaProxyRateLimiter.assertStreamAllowed(request, resolvedToken);
        if (!mediaS3Service.isS3ClientAvailable()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        String resolvedKey = key;
        if (resolvedKey == null || resolvedKey.isBlank()) {
            resolvedKey = S3MediaBorderUtils.extractS3Key(url, mediaS3Service.getS3BucketHost());
        } else {
            resolvedKey = S3MediaBorderUtils.sanitizeKey(resolvedKey);
        }
        if (resolvedKey == null || !resolvedKey.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            return ResponseEntity.badRequest().build();
        }

        mediaSecurityService.assertVodStreamAllowed(resolvedKey, resolvedToken);

        return mediaS3Service.buildStreamResponse(resolvedKey, rangeHeader);
    }

    @GetMapping("/proxy")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String url, HttpServletRequest request) {
        mediaProxyRateLimiter.assertProxyAllowed(request);
        return imageProxyService.proxyImage(url, mediaS3Service.getS3BucketHost(), mediaS3Service);
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
