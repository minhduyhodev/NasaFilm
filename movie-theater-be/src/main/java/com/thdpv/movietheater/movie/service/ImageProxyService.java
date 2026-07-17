package com.thdpv.movietheater.movie.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

@Service
public class ImageProxyService {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "image.tmdb.org",
            "upload.wikimedia.org",
            S3MediaBorderUtils.DEFAULT_BUCKET_HOST);

    private static final URI TMDB_PROBE_URI = URI.create(
            "https://image.tmdb.org/t/p/w92/yyUxBvl863sBlF5OzuGmSc5jBHy.jpg");

    private final RestClient restClient;
    private final RestClient probeClient;

    public ImageProxyService() {
        this.restClient = RestClient.builder()
                .requestFactory(createRequestFactory(8000, 8000))
                .build();
        this.probeClient = RestClient.builder()
                .requestFactory(createRequestFactory(3000, 3000))
                .build();
    }

    public boolean isTmdbReachable() {
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

    public ResponseEntity<byte[]> proxyImage(String url, String s3BucketHost, MediaS3Service mediaS3Service) {
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
        if (host == null || !isAllowedProxyHost(host, s3BucketHost)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Hardening VOD: chặn mọi file phim movie/* qua /proxy
        String s3KeyMaybeMovie = S3MediaBorderUtils.extractS3Key(url, s3BucketHost);
        if (s3KeyMaybeMovie != null
                && s3KeyMaybeMovie.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Video S3: dùng border redirect, không tải full file qua BE.
        String path = sourceUri.getPath() != null ? sourceUri.getPath().toLowerCase() : "";
        if (host.equalsIgnoreCase(s3BucketHost)
                && (path.endsWith(".mp4") || path.endsWith(".mkv") || path.endsWith(".webm") || path.endsWith(".m3u8"))) {
            String s3Key = S3MediaBorderUtils.extractS3Key(url, s3BucketHost);
            // Bảo vệ VOD: không cấp file phim (movie/) qua proxy; chỉ /stream + token.
            if (s3Key != null && s3Key.toLowerCase(Locale.ROOT).startsWith("movie/")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            // Redirect sang S3 public hoặc presigned URL thông qua mediaS3Service
            ResponseEntity<Void> redirectRes = mediaS3Service.getPresignedRedirect(s3Key);
            return ResponseEntity.status(redirectRes.getStatusCode())
                    .headers(redirectRes.getHeaders())
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

    private boolean isAllowedProxyHost(String host, String s3BucketHost) {
        if (ALLOWED_HOSTS.stream().anyMatch(allowed -> allowed.equalsIgnoreCase(host))) {
            return true;
        }
        return s3BucketHost != null && s3BucketHost.equalsIgnoreCase(host);
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
