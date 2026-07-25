package com.thdpv.movietheater.config.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.config.service.SystemConfigService;

@RestController
@RequestMapping("/api/admin/system-config")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSystemConfigController {

    private final SystemConfigService systemConfigService;

    public AdminSystemConfigController(SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemConfig() {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.getConfig()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveSystemConfig(
            @RequestBody Map<String, Object> config) {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.saveConfig(config)));
    }
}
