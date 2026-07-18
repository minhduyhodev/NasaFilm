package com.thdpv.movietheater.movie.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartAbortRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartCompleteRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartCompleteResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartInitiateRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartInitiateResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartSignPartRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3MultipartSignPartResponse;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3PresignPutRequest;
import com.thdpv.movietheater.movie.dto.S3UploadDtos.S3PresignPutResponse;
import com.thdpv.movietheater.movie.service.S3MediaUploadService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/s3")
@RequiredArgsConstructor
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${app.s3.access-key-id:}') && T(org.springframework.util.StringUtils).hasText('${app.s3.secret-access-key:}')")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
public class S3AdminController {

    private final S3MediaUploadService s3MediaUploadService;

    @PostMapping("/presign-put")
    public ResponseEntity<ApiResponse<S3PresignPutResponse>> presignPut(
            @Valid @RequestBody S3PresignPutRequest request) {
        return ResponseEntity.ok(ApiResponse.success(s3MediaUploadService.presignPut(request)));
    }

    @PostMapping("/multipart/initiate")
    public ResponseEntity<ApiResponse<S3MultipartInitiateResponse>> initiateMultipart(
            @Valid @RequestBody S3MultipartInitiateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(s3MediaUploadService.initiateMultipart(request)));
    }

    @PostMapping("/multipart/sign-part")
    public ResponseEntity<ApiResponse<S3MultipartSignPartResponse>> signPart(
            @Valid @RequestBody S3MultipartSignPartRequest request) {
        return ResponseEntity.ok(ApiResponse.success(s3MediaUploadService.signPart(request)));
    }

    @PostMapping("/multipart/complete")
    public ResponseEntity<ApiResponse<S3MultipartCompleteResponse>> completeMultipart(
            @Valid @RequestBody S3MultipartCompleteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(s3MediaUploadService.completeMultipart(request)));
    }

    @PostMapping("/multipart/abort")
    public ResponseEntity<ApiResponse<Void>> abortMultipart(
            @Valid @RequestBody S3MultipartAbortRequest request) {
        s3MediaUploadService.abortMultipart(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã hủy multipart upload"));
    }
}
