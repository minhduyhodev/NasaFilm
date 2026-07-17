package com.thdpv.movietheater.movie.service;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Locale;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@Service
public class MediaS3Service {

    private final String s3PublicBaseUrl;
    private final String s3BucketHost;
    private final String bucket;
    private final long presignTtlSeconds;
    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final Cache<String, StreamHeadMeta> streamHeadCache;

    public record StreamHeadMeta(long contentLength, String contentType) {
    }

    public MediaS3Service(
            @Value("${app.s3.public-base-url:" + S3MediaBorderUtils.DEFAULT_PUBLIC_BASE + "}") String s3PublicBaseUrl,
            @Value("${app.s3.bucket:java-06}") String bucket,
            @Value("${app.s3.presign-ttl-seconds:3600}") long presignTtlSeconds,
            ObjectProvider<S3Presigner> s3PresignerProvider,
            ObjectProvider<S3Client> s3ClientProvider) {
        this.s3PublicBaseUrl = s3PublicBaseUrl;
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
        }
        this.s3BucketHost = host;
    }

    public boolean isS3ClientAvailable() {
        return s3Client != null;
    }

    public String getS3BucketHost() {
        return s3BucketHost;
    }
    
    public String getS3PublicBaseUrl() {
        return s3PublicBaseUrl;
    }

    public ResponseEntity<Void> getPresignedRedirect(String resolvedKey) {
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
                // fall back to public redirect if fails
            }
        }

        String target = S3MediaBorderUtils.buildPublicObjectUrl(resolvedKey, s3PublicBaseUrl);
        if (target == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target))
                .build();
    }

    public ResponseEntity<StreamingResponseBody> buildStreamResponse(String objectKey, String rangeHeader) {
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
        } catch (S3Exception ex) {
            streamHeadCache.invalidate(objectKey);
            if (ex.statusCode() == 403 || ex.statusCode() == 404) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
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
}
