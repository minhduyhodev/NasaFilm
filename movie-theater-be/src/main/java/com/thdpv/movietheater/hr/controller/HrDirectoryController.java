package com.thdpv.movietheater.hr.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.response.StaffDirectoryResponse;
import com.thdpv.movietheater.hr.service.HrDirectory;

import lombok.RequiredArgsConstructor;

/**
 * Danh bạ nhân viên rút gọn — dùng chung cho các trang xếp ca / duyệt công / lương.
 */
@RestController
@RequestMapping("/api/hr/admin/staff-directory")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('HR_SHIFT_MANAGE','HR_ATTENDANCE_MANAGE','HR_PAYROLL_MANAGE')")
public class HrDirectoryController {

    private final HrDirectory directory;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StaffDirectoryResponse>>> list() {
        List<StaffDirectoryResponse> staff = directory.listActiveStaff().stream()
                .map(u -> new StaffDirectoryResponse(u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl()))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(staff));
    }
}
