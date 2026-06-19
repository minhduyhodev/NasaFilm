package com.thdpv.movietheater.config.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.config.service.SystemConfigService;

@RestController
@RequestMapping("/api/system-config")
public class SystemConfigController {

    private final SystemConfigService systemConfigService;

    public SystemConfigController(SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemConfig() {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.getConfig()));
    }
}
