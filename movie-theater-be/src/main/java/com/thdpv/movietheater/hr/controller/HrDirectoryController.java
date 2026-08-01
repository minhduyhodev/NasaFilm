package com.thdpv.movietheater.hr.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.response.ShiftPermissionCatalogResponse;
import com.thdpv.movietheater.hr.dto.response.StaffDirectoryResponse;
import com.thdpv.movietheater.hr.service.HrDirectory;
import com.thdpv.movietheater.user.enums.PermissionName;

import lombok.RequiredArgsConstructor;

/**
 * Danh bạ nhân viên rút gọn — dùng chung cho các trang xếp ca / duyệt công / lương.
 */
@RestController
@RequestMapping("/api/hr/admin/staff-directory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_VIEW') or hasAnyAuthority('HR_SHIFT_MANAGE','HR_ATTENDANCE_MANAGE','HR_PAYROLL_MANAGE')")
public class HrDirectoryController {

    private final HrDirectory directory;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StaffDirectoryResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(directory.staffDirectory()));
    }

    /** Bộ quyền "vận hành ca" mặc định + toàn bộ quyền (kèm nhãn) để FE kiểm tra/cấu hình theo ca. */
    @GetMapping("/permission-catalog")
    public ResponseEntity<ApiResponse<ShiftPermissionCatalogResponse>> permissionCatalog() {
        List<ShiftPermissionCatalogResponse.PermissionInfo> required = PermissionName.shiftOperationalRequired().stream()
                .map(HrDirectoryController::toPermissionInfo)
                .toList();
        List<ShiftPermissionCatalogResponse.PermissionInfo> all = java.util.Arrays.stream(PermissionName.values())
                .map(HrDirectoryController::toPermissionInfo)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(new ShiftPermissionCatalogResponse(required, all)));
    }

    private static ShiftPermissionCatalogResponse.PermissionInfo toPermissionInfo(PermissionName p) {
        return new ShiftPermissionCatalogResponse.PermissionInfo(p.name(), p.getDescription(), p.getGroup());
    }
}
