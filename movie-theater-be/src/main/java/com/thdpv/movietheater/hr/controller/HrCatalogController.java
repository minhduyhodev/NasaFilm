package com.thdpv.movietheater.hr.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.request.ShiftRequiredPermissionsRequest;
import com.thdpv.movietheater.hr.dto.response.ShiftDefinitionResponse;
import com.thdpv.movietheater.hr.service.ShiftDefinitionService;

import lombok.RequiredArgsConstructor;

/**
 * Danh mục ca làm việc — dùng chung cho cả admin và nhân viên.
 */
@RestController
@RequestMapping("/api/hr")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class HrCatalogController {

    private final ShiftDefinitionService shiftDefinitionService;

    @GetMapping("/shift-definitions")
    public ResponseEntity<ApiResponse<List<ShiftDefinitionResponse>>> listShiftDefinitions() {
        return ResponseEntity.ok(ApiResponse.success(shiftDefinitionService.listActive()));
    }

    /** Cấu hình bộ quyền vận hành yêu cầu cho một ca (chỉ HR_SHIFT_MANAGE). */
    @PutMapping("/admin/shift-definitions/{uuid}/required-permissions")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_SHIFT_MANAGE')")
    public ResponseEntity<ApiResponse<ShiftDefinitionResponse>> updateRequiredPermissions(
            @PathVariable UUID uuid,
            @RequestBody ShiftRequiredPermissionsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                shiftDefinitionService.updateRequiredPermissions(uuid, request.permissions())));
    }
}
