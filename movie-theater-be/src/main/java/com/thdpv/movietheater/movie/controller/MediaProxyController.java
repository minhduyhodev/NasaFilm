package com.thdpv.movietheater.movie.controller;

import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.response.TmdbStatusResponse;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.support.MediaProxyRateLimiter;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

import jakarta.servlet.http.HttpServletRequest;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@RestController
@RequestMapping("/api/media")
public class MediaProxyController {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "image.tmdb.org",
            "upload.wikimedia.org",
            S3MediaBorderUtils.DEFAULT_BUCKET_HOST);

    private static final URI TMDB_PROBE_URI = URI.create(
            "https://image.tmdb.org/t/p/w92/yyUxBvl863sBlF5OzuGmSc5jBHy.jpg");

    private final RestClient restClient;
    private final RestClient probeClient;
    private final String s3PublicBaseUrl;
    private final String s3BucketHost;
    private final MediaProxyRateLimiter mediaProxyRateLimiter;
    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;
    private final String bucket;
    private final long presignTtlSeconds;
    private final S3Presigner s3Presigner; // optional
    private final S3Client s3Client; // optional
    private final Cache<String, StreamHeadMeta> streamHeadCache;

    private record StreamHeadMeta(long contentLength, String contentType) {
    }

    public MediaProxyController(
            @Value("${app.s3.public-base-url:" + S3MediaBorderUtils.DEFAULT_PUBLIC_BASE + "}") String s3PublicBaseUrl,
            @Value("${app.s3.bucket:java-06}") String bucket,
            @Value("${app.s3.presign-ttl-seconds:3600}") long presignTtlSeconds,
            ObjectProvider<S3Presigner> s3PresignerProvider,
            ObjectProvider<S3Client> s3ClientProvider,
            MediaProxyRateLimiter mediaProxyRateLimiter,
            BookingRepository bookingRepository,
            MovieRepository movieRepository) {
        this.restClient = RestClient.builder()
                .requestFactory(createRequestFactory(8000, 8000))
                .build();
        this.probeClient = RestClient.builder()
                .requestFactory(createRequestFactory(3000, 3000))
                .build();
        this.s3PublicBaseUrl = s3PublicBaseUrl;
        this.mediaProxyRateLimiter = mediaProxyRateLimiter;
        this.bookingRepository = bookingRepository;
        this.movieRepository = movieRepository;
        this.bucket = bucket;
        this.presignTtlSeconds = presignTtlSeconds;
        this.s3Presigner = s3PresignerProvider.getIfAvailable();
        this.s3Client = s3ClientProvider.getIfAvailable();
        this.streamHeadCache = Caffeine.newBuilder()
                .maximumSize(2_000)
                .expireAfterWrite(Duration.ofMinutes(10))
                .build();
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
     * Border request: FE gọi link NasaFilm, BE redirect sang media URL.
     * - Nếu bucket public: redirect tới public S3 URL
     * - Nếu bucket private: redirect tới pre-signed GET URL
     *
     * Ví dụ: {@code GET /api/media/border?key=trailer/MuaDo_Trailer.mp4}
     */
    @GetMapping("/border")
    public ResponseEntity<Void> borderRedirect(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String url,
            HttpServletRequest request) {
        mediaProxyRateLimiter.assertBorderAllowed(request);
        String resolvedKey = key;
        if (resolvedKey == null || resolvedKey.isBlank()) {
            resolvedKey = S3MediaBorderUtils.extractS3Key(url, s3BucketHost);
        } else {
            resolvedKey = S3MediaBorderUtils.sanitizeKey(resolvedKey);
        }

        // Bảo vệ VOD: file phim (movie/) chỉ được phát qua /stream + token vé.
        // Border chỉ phục vụ poster/ và trailer/ (redirect công khai/presigned).
        if (resolvedKey != null && resolvedKey.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String target = S3MediaBorderUtils.buildPublicObjectUrl(resolvedKey, s3PublicBaseUrl);

        // If bucket is private, public redirect sẽ bị 403. Khi đó, dùng presigned URL để browser fetch được.
        if (s3Presigner != null) {
            try {
                GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(resolvedKey)
                        .build();

                PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(
                        GetObjectPresignRequest.builder()
                                .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                                .getObjectRequest(getObjectRequest)
                                .build()
                );

                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(presigned.url().toString()))
                        .build();
            } catch (Exception ignored) {
                // If presigning fails, fall back to public redirect.
            }
        }

        if (target == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target))
                .build();
    }

    /**
     * Stream video same-origin với hỗ trợ HTTP Range (206).
     * Chỉ cho phép key movie/ + token vé VOD hợp lệ.
     */
    @GetMapping("/stream")
    public ResponseEntity<StreamingResponseBody> streamMedia(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String url,
            @RequestParam(required = false) String token,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader,
            HttpServletRequest request) {
        mediaProxyRateLimiter.assertStreamAllowed(request);
        if (s3Client == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        String resolvedKey = key;
        if (resolvedKey == null || resolvedKey.isBlank()) {
            resolvedKey = S3MediaBorderUtils.extractS3Key(url, s3BucketHost);
        } else {
            resolvedKey = S3MediaBorderUtils.sanitizeKey(resolvedKey);
        }
        if (resolvedKey == null || !resolvedKey.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            return ResponseEntity.badRequest().build();
        }

        assertVodStreamAllowed(resolvedKey, token);

        final String objectKey = resolvedKey;
        try {
            StreamHeadMeta meta = streamHeadCache.get(objectKey, k -> {
                HeadObjectResponse head = s3Client.headObject(HeadObjectRequest.builder()
                        .bucket(bucket)
                        .key(k)
                        .build());
                long size = head.contentLength() != null ? head.contentLength() : 0L;
                String ct = head.contentType();
                if (ct == null || ct.isBlank() || "application/octet-stream".equalsIgnoreCase(ct)) {
                    ct = guessVideoContentType(k);
                }
                return new StreamHeadMeta(size, ct);
            });

            long totalSize = meta.contentLength();
            if (totalSize <= 0) {
                streamHeadCache.invalidate(objectKey);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }

            String contentType = meta.contentType();

            long startPos = 0L;
            long endPos = totalSize - 1L;
            boolean partial = false;
            if (rangeHeader != null && rangeHeader.regionMatches(true, 0, "bytes=", 0, 6)) {
                String spec = rangeHeader.substring(6).trim();
                int dash = spec.indexOf('-');
                if (dash >= 0) {
                    String startPart = spec.substring(0, dash).trim();
                    String endPart = spec.substring(dash + 1).trim();
                    if (startPart.isEmpty() && !endPart.isEmpty()) {
                        long suffix = Long.parseLong(endPart);
                        startPos = Math.max(0L, totalSize - suffix);
                        endPos = totalSize - 1L;
                    } else {
                        if (!startPart.isEmpty()) {
                            startPos = Long.parseLong(startPart);
                        }
                        if (!endPart.isEmpty()) {
                            endPos = Long.parseLong(endPart);
                        }
                        if (endPos >= totalSize) {
                            endPos = totalSize - 1L;
                        }
                    }
                    if (startPos > endPos || startPos < 0) {
                        return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                                .header(HttpHeaders.CONTENT_RANGE, "bytes */" + totalSize)
                                .build();
                    }
                    partial = true;
                }
            }

            final long rangeStart = startPos;
            final long rangeEnd = endPos;
            final long partLength = rangeEnd - rangeStart + 1;

            GetObjectRequest.Builder getBuilder = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey);
            if (partial) {
                getBuilder.range("bytes=" + rangeStart + "-" + rangeEnd);
            }

            ResponseInputStream<GetObjectResponse> s3Stream = s3Client.getObject(getBuilder.build());

            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(partLength);
            headers.setCacheControl("private, no-store");
            if (partial) {
                headers.set(HttpHeaders.CONTENT_RANGE,
                        "bytes " + rangeStart + "-" + rangeEnd + "/" + totalSize);
            }

            StreamingResponseBody body = outputStream -> {
                try (InputStream in = s3Stream) {
                    in.transferTo(outputStream);
                    outputStream.flush();
                }
            };

            return new ResponseEntity<>(body, headers, partial ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK);
        } catch (NoSuchKeyException ex) {
            streamHeadCache.invalidate(objectKey);
            return ResponseEntity.notFound().build();
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @GetMapping("/proxy")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String url, HttpServletRequest request) {
        mediaProxyRateLimiter.assertProxyAllowed(request);
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

        // Hardening VOD: chặn mọi file phim movie/* qua /proxy
        // (không phụ thuộc đuôi file; border đã chặn sẵn, proxy video trước đây có "extension hole").
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
            if (s3Presigner != null) {
                try {
                    GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(s3Key)
                            .build();

                    PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(
                            GetObjectPresignRequest.builder()
                                    .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                                    .getObjectRequest(getObjectRequest)
                                    .build()
                    );

                    return ResponseEntity.status(HttpStatus.FOUND)
                            .location(URI.create(presigned.url().toString()))
                            .build();
                } catch (Exception ignored) {
                    // fall through to public redirect
                }
            }

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

    private static String guessVideoContentType(String key) {
        String lower = key == null ? "" : key.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".webm")) {
            return "video/webm";
        }
        if (lower.endsWith(".m3u8")) {
            return "application/vnd.apple.mpegurl";
        }
        if (lower.endsWith(".mkv")) {
            return "video/x-matroska";
        }
        return "video/mp4";
    }

    /** Xác thực token vé VOD khi stream key movie/. */
    private void assertVodStreamAllowed(String objectKey, String token) {
        if (objectKey == null || !objectKey.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stream chỉ hỗ trợ key movie/");
        }
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token phát trực tuyến");
        }

        Optional<Booking> bookingOpt = bookingRepository
                .findFirstByStreamTokenAndExpiresAtAfter(token.trim(), OffsetDateTime.now());
        if (bookingOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token phát không hợp lệ hoặc đã hết hạn");
        }

        Booking booking = bookingOpt.get();
        if (booking.getMovieUuid() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token phát không hợp lệ");
        }

        Movie movie = movieRepository.findById(booking.getMovieUuid()).orElse(null);
        if (movie == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không tìm thấy phim của vé");
        }

        String resolved = S3MediaBorderUtils.resolveStreamingUrl(movie);
        String expectedKey = S3MediaBorderUtils.extractS3Key(resolved);
        if (expectedKey == null || !expectedKey.equalsIgnoreCase(objectKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token không khớp file phim");
        }
    }
}
