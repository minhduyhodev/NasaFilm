package com.thdpv.movietheater.notification.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.notification.dto.request.EmailTemplateRequest;
import com.thdpv.movietheater.notification.dto.response.EmailTemplateResponse;
import com.thdpv.movietheater.notification.service.EmailTemplateService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/email-templates")
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmailTemplateController {

    private final EmailTemplateService emailTemplateService;

    public AdminEmailTemplateController(EmailTemplateService emailTemplateService) {
        this.emailTemplateService = emailTemplateService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmailTemplateResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(emailTemplateService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmailTemplateResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(emailTemplateService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EmailTemplateResponse>> create(
            @Valid @RequestBody EmailTemplateRequest request) {
        EmailTemplateResponse created = emailTemplateService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmailTemplateResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody EmailTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(emailTemplateService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        emailTemplateService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa mẫu email"));
    }
}
