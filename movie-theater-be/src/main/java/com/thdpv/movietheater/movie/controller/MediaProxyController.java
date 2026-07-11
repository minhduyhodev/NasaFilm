package com.thdpv.movietheater.movie.controller;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.response.TmdbStatusResponse;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

@RestController
@RequestMapping("/api/media")
public class MediaProxyController {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "image.tmdb.org",
            S3MediaBorderUtils.DEFAULT_BUCKET_HOST);

    private static final URI TMDB_PROBE_URI = URI.create(
            "https://image.tmdb.org/t/p/w92/yyUxBvl863sBlF5OzuGmSc5jBHy.jpg");

    private final RestClient restClient;
    private final RestClient probeClient;
    private final String s3PublicBaseUrl;
    private final String s3BucketHost;

    public MediaProxyController(
            @Value("${app.s3.public-base-url:" + S3MediaBorderUtils.DEFAULT_PUBLIC_BASE + "}") String s3PublicBaseUrl) {
        this.restClient = RestClient.builder()
                .requestFactory(createRequestFactory(8000, 8000))
                .build();
        this.probeClient = RestClient.builder()
                .requestFactory(createRequestFactory(3000, 3000))
                .build();
        this.s3PublicBaseUrl = s3PublicBaseUrl;
        String host = S3MediaBorderUtils.DEFAULT_BUCKET_HOST;
        try {
            URI base = URI.create(s3PublicBaseUrl);
            if (base.getHost() != null) {
                host = base.getHost();
            }
        } catch (Exception ignored) {
            // keep default host
        }
        this.s3BucketHost = host;
    }

    @GetMapping("/tmdb-status")
    public ResponseEntity<ApiResponse<TmdbStatusResponse>> tmdbStatus() {
        return ResponseEntity.ok(ApiResponse.success(new TmdbStatusResponse(isTmdbReachable())));
    }

    /**
     * Border request: FE gọi link NasaFilm, BE 302 sang Object URL S3 (bucket public).
     * Ví dụ: {@code GET /api/media/border?key=trailer/MuaDo_Trailer.mp4}
     */
    @GetMapping("/border")
    public ResponseEntity<Void> borderRedirect(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String url) {
        String resolvedKey = key;
        if (resolvedKey == null || resolvedKey.isBlank()) {
            resolvedKey = S3MediaBorderUtils.extractS3Key(url, s3BucketHost);
        } else {
            resolvedKey = S3MediaBorderUtils.sanitizeKey(resolvedKey);
        }

        String target = S3MediaBorderUtils.buildPublicObjectUrl(resolvedKey, s3PublicBaseUrl);
        if (target == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target))
                .build();
    }

    @GetMapping("/proxy")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String url) {
        URI sourceUri;
        try {
            sourceUri = new URI(url.trim());
        } catch (URISyntaxException ex) {
            return ResponseEntity.badRequest().build();
        }

        if (!"https".equalsIgnoreCase(sourceUri.getScheme())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String host = sourceUri.getHost();
        if (host == null || !isAllowedProxyHost(host)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Video S3: dùng border redirect, không tải full file qua BE.
        String path = sourceUri.getPath() != null ? sourceUri.getPath().toLowerCase() : "";
        if (host.equalsIgnoreCase(s3BucketHost)
                && (path.endsWith(".mp4") || path.endsWith(".mkv") || path.endsWith(".webm") || path.endsWith(".m3u8"))) {
            String s3Key = S3MediaBorderUtils.extractS3Key(url, s3BucketHost);
            String target = S3MediaBorderUtils.buildPublicObjectUrl(s3Key, s3PublicBaseUrl);
            if (target == null) {
                return ResponseEntity.badRequest().build();
            }
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(target))
                    .build();
        }

        try {
            byte[] body = restClient.get()
                    .uri(sourceUri)
                    .retrieve()
                    .body(byte[].class);

            if (body == null || body.length == 0) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(resolveContentType(sourceUri.getPath()));
            headers.setCacheControl("public, max-age=86400");
            return new ResponseEntity<>(body, headers, HttpStatus.OK);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    private boolean isAllowedProxyHost(String host) {
        if (ALLOWED_HOSTS.stream().anyMatch(allowed -> allowed.equalsIgnoreCase(host))) {
            return true;
        }
        return s3BucketHost != null && s3BucketHost.equalsIgnoreCase(host);
    }

    private boolean isTmdbReachable() {
        try {
            probeClient.head()
                    .uri(TMDB_PROBE_URI)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private SimpleClientHttpRequestFactory createRequestFactory(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);
        return requestFactory;
    }

    private MediaType resolveContentType(String path) {
        if (path != null && path.toLowerCase().endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (path != null && path.toLowerCase().endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }
}
