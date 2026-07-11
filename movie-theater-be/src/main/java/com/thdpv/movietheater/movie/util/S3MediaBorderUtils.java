package com.thdpv.movietheater.movie.util;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

/**
 * Đổi Object URL S3 public thành link border của BE: {@code /api/media/border?key=...}.
 * FE chỉ gọi domain NasaFilm; BE redirect sang S3 (bucket public + time-window ở lớp VOD).
 */
public final class S3MediaBorderUtils {

    public static final String BORDER_PATH = "/api/media/border";
    public static final String DEFAULT_BUCKET_HOST = "java-06.s3.ap-southeast-1.amazonaws.com";
    public static final String DEFAULT_PUBLIC_BASE = "https://" + DEFAULT_BUCKET_HOST;

    private static final Set<String> ALLOWED_PREFIXES = Set.of("movie/", "poster/", "trailer/");

    private S3MediaBorderUtils() {
    }

    public static String toBorderUrl(String mediaUrl) {
        return toBorderUrl(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static String toBorderUrl(String mediaUrl, String allowedHost) {
        String key = extractS3Key(mediaUrl, allowedHost);
        if (key == null) {
            return mediaUrl;
        }
        return BORDER_PATH + "?key=" + URLEncoder.encode(key, StandardCharsets.UTF_8);
    }

    public static String extractS3Key(String mediaUrl) {
        return extractS3Key(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static String extractS3Key(String mediaUrl, String allowedHost) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return null;
        }
        String trimmed = mediaUrl.trim();
        if (trimmed.startsWith(BORDER_PATH)) {
            int idx = trimmed.indexOf("key=");
            if (idx < 0) {
                return null;
            }
            String raw = trimmed.substring(idx + 4);
            int amp = raw.indexOf('&');
            if (amp >= 0) {
                raw = raw.substring(0, amp);
            }
            return sanitizeKey(java.net.URLDecoder.decode(raw, StandardCharsets.UTF_8));
        }

        try {
            URI uri = URI.create(trimmed);
            String host = uri.getHost();
            if (host == null || !host.equalsIgnoreCase(allowedHost)) {
                return null;
            }
            String path = uri.getPath();
            if (path == null || path.isBlank() || "/".equals(path)) {
                return null;
            }
            String key = path.startsWith("/") ? path.substring(1) : path;
            return sanitizeKey(key);
        } catch (Exception ex) {
            return null;
        }
    }

    public static String sanitizeKey(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        String normalized = key.trim().replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (normalized.contains("..") || normalized.contains("//")) {
            return null;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        boolean allowed = ALLOWED_PREFIXES.stream().anyMatch(lower::startsWith);
        return allowed ? normalized : null;
    }

    public static String buildPublicObjectUrl(String key) {
        return buildPublicObjectUrl(key, DEFAULT_PUBLIC_BASE);
    }

    public static String buildPublicObjectUrl(String key, String publicBaseUrl) {
        String safeKey = sanitizeKey(key);
        if (safeKey == null) {
            return null;
        }
        String base = publicBaseUrl == null || publicBaseUrl.isBlank() ? DEFAULT_PUBLIC_BASE : publicBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + safeKey;
    }

    /** Link file phim đầy đủ trên bucket mentor (prefix {@code movie/}). */
    public static boolean isAwsMovieStreamingUrl(String mediaUrl) {
        return isAwsMovieStreamingUrl(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static boolean isAwsMovieStreamingUrl(String mediaUrl, String allowedHost) {
        String key = extractS3Key(mediaUrl, allowedHost);
        if (key == null) {
            return false;
        }
        return key.toLowerCase(Locale.ROOT).startsWith("movie/");
    }

    /** Poster / trailer / movie trên đúng host S3 được phép. */
    public static boolean isAwsMediaUrl(String mediaUrl) {
        return isAwsMediaUrl(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static boolean isAwsMediaUrl(String mediaUrl, String allowedHost) {
        return extractS3Key(mediaUrl, allowedHost) != null;
    }
}
