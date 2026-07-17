package com.thdpv.movietheater.movie.service;

import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartAbortRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartCompleteRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartCompleteResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartInitiateRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartInitiateResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartSignPartRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartSignPartResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3PresignPutRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3PresignPutResponse;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.AbortMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompleteMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedUploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

@Service
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${app.s3.access-key-id:}') && T(org.springframework.util.StringUtils).hasText('${app.s3.secret-access-key:}')")
public class S3MediaUploadService {

    private static final Pattern SAFE_NAME = Pattern.compile("[^a-zA-Z0-9._-]+");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-zA-Z0-9]+");
    private static final Pattern GARBAGE_NAME = Pattern.compile(
            "(?i)opstream|vip\\.|mixed\\.m3u8|https?|_[0-9a-f]{6,}_");

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final long presignTtlSeconds;
    private final long multipartPartSizeBytes;

    public S3MediaUploadService(
            S3Client s3Client,
            S3Presigner s3Presigner,
            @Value("${app.s3.bucket}") String bucket,
            @Value("${app.s3.presign-ttl-seconds:3600}") long presignTtlSeconds,
            @Value("${app.s3.multipart-part-size-bytes:16777216}") long multipartPartSizeBytes) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.presignTtlSeconds = presignTtlSeconds;
        this.multipartPartSizeBytes = multipartPartSizeBytes;
    }

    public S3PresignPutResponse presignPut(S3PresignPutRequest request) {
        String key = buildObjectKey(request.getFolder(), request.getFileName(), request.getMovieTitle());
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(request.getContentType().trim())
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                        .putObjectRequest(putObjectRequest)
                        .build());

        return new S3PresignPutResponse(
                key,
                bucket,
                "PUT",
                presigned.url().toString(),
                presignTtlSeconds);
    }

    public S3MultipartInitiateResponse initiateMultipart(S3MultipartInitiateRequest request) {
        String key = buildObjectKey(request.getFolder(), request.getFileName(), request.getMovieTitle());
        CreateMultipartUploadResponse created = s3Client.createMultipartUpload(
                CreateMultipartUploadRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(request.getContentType().trim())
                        .build());

        return new S3MultipartInitiateResponse(
                key,
                bucket,
                created.uploadId(),
                multipartPartSizeBytes);
    }

    public S3MultipartSignPartResponse signPart(S3MultipartSignPartRequest request) {
        String key = requireAllowedKey(request.getKey());
        UploadPartRequest uploadPartRequest = UploadPartRequest.builder()
                .bucket(bucket)
                .key(key)
                .uploadId(request.getUploadId())
                .partNumber(request.getPartNumber())
                .build();

        PresignedUploadPartRequest presigned = s3Presigner.presignUploadPart(
                UploadPartPresignRequest.builder()
                        .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                        .uploadPartRequest(uploadPartRequest)
                        .build());

        return new S3MultipartSignPartResponse(
                key,
                request.getUploadId(),
                request.getPartNumber(),
                "PUT",
                presigned.url().toString(),
                presignTtlSeconds);
    }

    public S3MultipartCompleteResponse completeMultipart(S3MultipartCompleteRequest request) {
        String key = requireAllowedKey(request.getKey());
        var completedParts = request.getParts().stream()
                .sorted(Comparator.comparing(S3MultipartCompleteRequest.PartETag::getPartNumber))
                .map(part -> CompletedPart.builder()
                        .partNumber(part.getPartNumber())
                        .eTag(normalizeEtag(part.getETag()))
                        .build())
                .toList();

        var result = s3Client.completeMultipartUpload(
                CompleteMultipartUploadRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .uploadId(request.getUploadId())
                        .multipartUpload(CompletedMultipartUpload.builder()
                                .parts(completedParts)
                                .build())
                        .build());

        return new S3MultipartCompleteResponse(key, bucket, result.eTag());
    }

    public void abortMultipart(S3MultipartAbortRequest request) {
        String key = requireAllowedKey(request.getKey());
        s3Client.abortMultipartUpload(AbortMultipartUploadRequest.builder()
                .bucket(bucket)
                .key(key)
                .uploadId(request.getUploadId())
                .build());
    }

    private String buildObjectKey(String folder, String fileName, String movieTitle) {
        String folderNorm = folder == null ? "" : folder.trim().toLowerCase(Locale.ROOT);
        if (!folderNorm.equals("poster") && !folderNorm.equals("trailer") && !folderNorm.equals("movie")) {
            throw new AppException(ErrorCode.BAD_REQUEST, "folder không hợp lệ");
        }

        String fromTitle = buildFileNameFromTitle(folderNorm, movieTitle, fileName);
        if (fromTitle != null && !fromTitle.isBlank()) {
            // Tránh ghi đè media khi admin upload lại (cùng title => cùng key cũ).
            // Chỉ áp dụng cho "movie/" vì đây là file VOD streaming nhạy cảm.
            if ("movie".equals(folderNorm)) {
                int dot = fromTitle.lastIndexOf('.');
                if (dot > 0 && dot < fromTitle.length() - 1) {
                    String base = fromTitle.substring(0, dot);
                    String ext = fromTitle.substring(dot);
                    String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                    fromTitle = base + "-" + suffix + ext;
                } else {
                    String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                    fromTitle = fromTitle + "-" + suffix;
                }
            }
            String key = folderNorm + "/" + SAFE_NAME.matcher(fromTitle).replaceAll("_");
            if (S3MediaBorderUtils.sanitizeKey(key) != null) {
                return key;
            }
        }

        String rawName = fileName == null ? "" : fileName.trim();
        int slash = Math.max(rawName.lastIndexOf('/'), rawName.lastIndexOf('\\'));
        if (slash >= 0) {
            rawName = rawName.substring(slash + 1);
        }
        if (rawName.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "fileName không hợp lệ — nhập Tên phim trước khi upload");
        }
        String safe = SAFE_NAME.matcher(rawName).replaceAll("_");
        if (safe.length() > 120) {
            String ext = "";
            int dot = safe.lastIndexOf('.');
            if (dot > 0 && dot < safe.length() - 1) {
                ext = safe.substring(dot);
                safe = safe.substring(0, Math.min(dot, 100)) + ext;
            } else {
                safe = safe.substring(0, 120);
            }
        }
        String prefix = looksLikeGarbageLocalName(rawName)
                ? UUID.randomUUID().toString().replace("-", "").substring(0, 8) + "_"
                : "";
        String key = folderNorm + "/" + prefix + safe;
        if (S3MediaBorderUtils.sanitizeKey(key) == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không tạo được S3 key hợp lệ");
        }
        return key;
    }

    /** Đặt tên file S3 theo tên phim (vd: avatar2009.mp4, poster/Avatar2009.jpg). */
    private static String buildFileNameFromTitle(String folder, String movieTitle, String originalFileName) {
        String ext = extractExtension(originalFileName);
        List<String> words = titleToWords(movieTitle);
        if (words.isEmpty()) {
            return null;
        }
        String pascal = toPascalCase(words);
        String lower = pascal.toLowerCase(Locale.ROOT);

        return switch (folder == null ? "" : folder.trim().toLowerCase(Locale.ROOT)) {
            case "movie" -> lower + ext;
            case "poster" -> pascal + ext;
            case "trailer" -> "trailer" + pascal + ext;
            default -> null;
        };
    }

    private static boolean looksLikeGarbageLocalName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return true;
        }
        String base = fileName.trim();
        int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
        if (slash >= 0) {
            base = base.substring(slash + 1);
        }
        return base.length() > 80 || GARBAGE_NAME.matcher(base).find();
    }

    private static List<String> titleToWords(String title) {
        if (title == null || title.isBlank()) {
            return List.of();
        }
        String normalized = Normalizer.normalize(title.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        String[] raw = NON_ALNUM.split(normalized);
        List<String> words = new ArrayList<>();
        for (String part : raw) {
            if (part != null && !part.isBlank()) {
                words.add(part);
            }
        }
        return words;
    }

    private static String toPascalCase(List<String> words) {
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (word.isEmpty()) {
                continue;
            }
            String lower = word.toLowerCase(Locale.ROOT);
            sb.append(Character.toUpperCase(lower.charAt(0)));
            if (lower.length() > 1) {
                sb.append(lower.substring(1));
            }
        }
        return sb.toString();
    }

    private static String extractExtension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return ".mp4";
        }
        String base = fileName.trim();
        int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
        if (slash >= 0) {
            base = base.substring(slash + 1);
        }
        int dot = base.lastIndexOf('.');
        if (dot > 0 && dot < base.length() - 1) {
            String ext = base.substring(dot).toLowerCase(Locale.ROOT);
            if (ext.length() <= 8) {
                return ext;
            }
        }
        return ".mp4";
    }

    private String requireAllowedKey(String key) {
        String sanitized = S3MediaBorderUtils.sanitizeKey(key);
        if (sanitized == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "key S3 không hợp lệ");
        }
        return sanitized;
    }

    private static String normalizeEtag(String etag) {
        if (etag == null) {
            return null;
        }
        String trimmed = etag.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        return trimmed;
    }
}
