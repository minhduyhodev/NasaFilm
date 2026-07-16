package com.thdpv.movietheater.movie.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Gom toàn bộ request/response DTO cho admin upload S3 (presign + multipart).
 */
public final class S3UploadDtos {

    private S3UploadDtos() {
    }

    public static class S3PresignPutRequest {

        @NotBlank
        @Pattern(regexp = "^(poster|trailer|movie)$", message = "folder phải là poster, trailer hoặc movie")
        private String folder;

        @NotBlank
        private String fileName;

        @NotBlank
        private String contentType;

        /** Tên phim trên form — dùng đặt key S3 (vd: movie/avatar2009.mp4). */
        private String movieTitle;

        public String getFolder() {
            return folder;
        }

        public void setFolder(String folder) {
            this.folder = folder;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getContentType() {
            return contentType;
        }

        public void setContentType(String contentType) {
            this.contentType = contentType;
        }

        public String getMovieTitle() {
            return movieTitle;
        }

        public void setMovieTitle(String movieTitle) {
            this.movieTitle = movieTitle;
        }
    }

    public static class S3MultipartInitiateRequest {

        @NotBlank
        @Pattern(regexp = "^(poster|trailer|movie)$", message = "folder phải là poster, trailer hoặc movie")
        private String folder;

        @NotBlank
        private String fileName;

        @NotBlank
        private String contentType;

        /** Tên phim trên form — dùng đặt key S3 (vd: movie/avatar2009.mp4). */
        private String movieTitle;

        public String getFolder() {
            return folder;
        }

        public void setFolder(String folder) {
            this.folder = folder;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        public String getContentType() {
            return contentType;
        }

        public void setContentType(String contentType) {
            this.contentType = contentType;
        }

        public String getMovieTitle() {
            return movieTitle;
        }

        public void setMovieTitle(String movieTitle) {
            this.movieTitle = movieTitle;
        }
    }

    public static class S3MultipartSignPartRequest {

        @NotBlank
        private String key;

        @NotBlank
        private String uploadId;

        @NotNull
        @Min(1)
        private Integer partNumber;

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getUploadId() {
            return uploadId;
        }

        public void setUploadId(String uploadId) {
            this.uploadId = uploadId;
        }

        public Integer getPartNumber() {
            return partNumber;
        }

        public void setPartNumber(Integer partNumber) {
            this.partNumber = partNumber;
        }
    }

    public static class S3MultipartCompleteRequest {

        @NotBlank
        private String key;

        @NotBlank
        private String uploadId;

        @NotEmpty
        @Valid
        private List<PartETag> parts;

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getUploadId() {
            return uploadId;
        }

        public void setUploadId(String uploadId) {
            this.uploadId = uploadId;
        }

        public List<PartETag> getParts() {
            return parts;
        }

        public void setParts(List<PartETag> parts) {
            this.parts = parts;
        }

        public static class PartETag {
            @NotNull
            private Integer partNumber;

            /**
             * Jackson coi getETag() là property "ETag"; FE gửi "eTag" → bind bằng @JsonProperty.
             */
            @NotBlank
            @JsonProperty("eTag")
            @JsonAlias({ "etag", "ETag" })
            private String eTag;

            public Integer getPartNumber() {
                return partNumber;
            }

            public void setPartNumber(Integer partNumber) {
                this.partNumber = partNumber;
            }

            @JsonProperty("eTag")
            public String getETag() {
                return eTag;
            }

            @JsonProperty("eTag")
            public void setETag(String eTag) {
                this.eTag = eTag;
            }
        }
    }

    public static class S3MultipartAbortRequest {

        @NotBlank
        private String key;

        @NotBlank
        private String uploadId;

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getUploadId() {
            return uploadId;
        }

        public void setUploadId(String uploadId) {
            this.uploadId = uploadId;
        }
    }

    public record S3PresignPutResponse(
            String key,
            String bucket,
            String method,
            String url,
            long expiresInSeconds) {
    }

    public record S3MultipartInitiateResponse(
            String key,
            String bucket,
            String uploadId,
            long partSizeBytes) {
    }

    public record S3MultipartSignPartResponse(
            String key,
            String uploadId,
            int partNumber,
            String method,
            String url,
            long expiresInSeconds) {
    }

    public record S3MultipartCompleteResponse(
            String key,
            String bucket,
            String eTag) {
    }
}
