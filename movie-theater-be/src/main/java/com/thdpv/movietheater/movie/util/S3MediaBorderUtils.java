package com.thdpv.movietheater.movie.util;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieMedia;

/**
 * Đổi S3 key / Object URL thành link border/stream của BE.
 * DB nên lưu key ({@code movie/avatar2009.mp4}); FE chỉ gọi domain NasaFilm.
 */
public final class S3MediaBorderUtils {

    public static final String BORDER_PATH = "/api/media/border";
    /** Same-origin Range stream — dùng cho &lt;video&gt; để tránh kẹt 302 cross-origin. */
    public static final String STREAM_PATH = "/api/media/stream";
    public static final String DEFAULT_BUCKET_HOST = "java-06.s3.ap-southeast-1.amazonaws.com";
    public static final String DEFAULT_PUBLIC_BASE = "https://" + DEFAULT_BUCKET_HOST;

    private static final Set<String> ALLOWED_PREFIXES = Set.of("movie/", "poster/", "trailer/");
    private static final Set<String> PRIMARY_STREAM_MEDIA_TYPES = Set.of(
            "STREAM", "FULL_MOVIE", "VIDEO", "ONLINE", "MOVIE");

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

    /**
     * URL phát video same-origin (hỗ trợ HTTP Range).
     * {@code movie/} cần token vé; {@code trailer/} công khai; poster vẫn {@link #toBorderUrl}.
     */
    public static String toStreamUrl(String mediaUrl) {
        return toStreamUrl(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static String toStreamUrl(String mediaUrl, String allowedHost) {
        String key = extractS3Key(mediaUrl, allowedHost);
        if (key == null) {
            return toBorderUrl(mediaUrl, allowedHost);
        }
        String lower = key.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("movie/") && !lower.startsWith("trailer/")) {
            return toBorderUrl(mediaUrl, allowedHost);
        }
        return STREAM_PATH + "?key=" + URLEncoder.encode(key, StandardCharsets.UTF_8);
    }

    /** Key được phép Range-stream qua {@code /api/media/stream}. */
    public static boolean isStreamableKey(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        String lower = key.toLowerCase(Locale.ROOT);
        return lower.startsWith("movie/") || lower.startsWith("trailer/");
    }

    /** File phim full cần vé VOD — không áp dụng cho trailer công khai. */
    public static boolean requiresVodStreamToken(String key) {
        return key != null && key.toLowerCase(Locale.ROOT).startsWith("movie/");
    }

    /** Stream URL kèm token vé VOD — FE/player phải gửi token khi gọi /api/media/stream. */
    public static String toStreamUrlWithToken(String mediaUrl, String streamToken) {
        String base = toStreamUrl(mediaUrl);
        if (streamToken == null || streamToken.isBlank() || base == null || !base.contains(STREAM_PATH)) {
            return base;
        }
        return base + "&token=" + URLEncoder.encode(streamToken.trim(), StandardCharsets.UTF_8);
    }

    /**
     * Chuẩn hóa về key để lưu DB. Nhận key thô, Object URL S3, hoặc border URL.
     * Không phải media AWS → trả nguyên (YouTube, Cloudinary…).
     */
    public static String toStoredKey(String mediaUrl) {
        return toStoredKey(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static String toStoredKey(String mediaUrl, String allowedHost) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return mediaUrl;
        }
        String key = extractS3Key(mediaUrl, allowedHost);
        return key != null ? key : mediaUrl.trim();
    }

    public static String extractS3Key(String mediaUrl) {
        return extractS3Key(mediaUrl, DEFAULT_BUCKET_HOST);
    }

    public static String extractS3Key(String mediaUrl, String allowedHost) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return null;
        }
        String trimmed = mediaUrl.trim();

        // 1) Đã là key: movie/... | poster/... | trailer/...
        String asKey = sanitizeKey(trimmed);
        if (asKey != null && !trimmed.contains("://") && !trimmed.startsWith(BORDER_PATH)) {
            return asKey;
        }

        // 2) Border / stream URL của BE
        if (trimmed.contains(BORDER_PATH) || trimmed.contains(STREAM_PATH)) {
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

        // 3) Object URL S3
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

    /** Resolve URL phát từ field streamingUrl hoặc media S3 movie/ của phim. */
    public static String resolveStreamingUrl(Movie movie) {
        if (movie == null) {
            return null;
        }

        String directUrl = trimToNull(movie.getStreamingUrl());
        if (isAwsMovieStreamingUrl(directUrl)) {
            return directUrl;
        }

        List<MovieMedia> medias = movie.getMovieMedias();
        if (medias == null || medias.isEmpty()) {
            return null;
        }

        return medias.stream()
                .filter(Objects::nonNull)
                .filter(media -> matchesMediaType(media.getMediaType(), PRIMARY_STREAM_MEDIA_TYPES)
                        || looksLikeMovieKey(media.getMediaUrl()))
                .sorted(Comparator.comparingInt(media -> media.getSortOrder() != null ? media.getSortOrder() : 0))
                .map(MovieMedia::getMediaUrl)
                .map(S3MediaBorderUtils::trimToNull)
                .filter(S3MediaBorderUtils::isAwsMovieStreamingUrl)
                .findFirst()
                .orElse(null);
    }

    public static String resolveFromMediaRequests(List<MovieMediaRequest> medias) {
        if (medias == null || medias.isEmpty()) {
            return null;
        }

        return medias.stream()
                .filter(Objects::nonNull)
                .filter(media -> matchesMediaType(media.getMediaType(), PRIMARY_STREAM_MEDIA_TYPES)
                        || looksLikeMovieKey(media.getMediaUrl()))
                .sorted(Comparator.comparingInt(media -> media.getSortOrder() != null ? media.getSortOrder() : 0))
                .map(MovieMediaRequest::getMediaUrl)
                .map(S3MediaBorderUtils::trimToNull)
                .filter(S3MediaBorderUtils::isAwsMovieStreamingUrl)
                .findFirst()
                .orElse(null);
    }

    private static boolean looksLikeMovieKey(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return false;
        }
        String lower = mediaUrl.trim().toLowerCase(Locale.ROOT);
        return lower.startsWith("movie/") || lower.contains("/movie/");
    }

    private static boolean matchesMediaType(String mediaType, Set<String> allowedTypes) {
        if (mediaType == null || mediaType.isBlank()) {
            return false;
        }
        return allowedTypes.contains(mediaType.trim().toUpperCase(Locale.ROOT));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
