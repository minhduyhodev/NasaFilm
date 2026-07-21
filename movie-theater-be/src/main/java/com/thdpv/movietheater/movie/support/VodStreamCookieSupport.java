package com.thdpv.movietheater.movie.support;

import java.time.Duration;
import java.time.OffsetDateTime;

import org.springframework.http.ResponseCookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

public final class VodStreamCookieSupport {

    public static final String COOKIE_NAME = "vod_stream";
    public static final String COOKIE_PATH = "/api";

    private VodStreamCookieSupport() {
    }

    public static ResponseCookie create(String rawToken, OffsetDateTime expiresAt, boolean secure, String sameSite) {
        String normalizedSameSite = normalizeSameSite(sameSite);
        if ("None".equals(normalizedSameSite) && !secure) {
            throw new IllegalArgumentException("SameSite=None requires a Secure stream cookie");
        }
        long maxAgeSeconds = 0L;
        if (expiresAt != null) {
            maxAgeSeconds = Math.max(0L, Duration.between(OffsetDateTime.now(), expiresAt).getSeconds());
        }
        return ResponseCookie.from(COOKIE_NAME, rawToken == null ? "" : rawToken.trim())
                .httpOnly(true)
                .secure(secure)
                .path(COOKIE_PATH)
                .sameSite(normalizedSameSite)
                .maxAge(maxAgeSeconds)
                .build();
    }

    public static ResponseCookie clear(boolean secure, String sameSite) {
        String normalizedSameSite = normalizeSameSite(sameSite);
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .path(COOKIE_PATH)
                .sameSite(normalizedSameSite)
                .maxAge(0)
                .build();
    }

    public static String read(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue().trim();
            }
        }
        return null;
    }

    private static String normalizeSameSite(String sameSite) {
        if (sameSite == null || sameSite.isBlank()) {
            return "Lax";
        }
        return switch (sameSite.trim().toLowerCase()) {
            case "strict" -> "Strict";
            case "none" -> "None";
            default -> "Lax";
        };
    }
}
