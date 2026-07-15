package com.thdpv.movietheater.hr.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.request.EmployeeProfileRequest;
import com.thdpv.movietheater.hr.dto.response.EmployeeProfileResponse;
import com.thdpv.movietheater.hr.service.EmployeeProfileService;
import com.thdpv.movietheater.hr.service.HrDirectory;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Hồ sơ lương nhân viên (Admin / HR_PAYROLL_MANAGE).
 */
@RestController
@RequestMapping("/api/hr/admin/employee-profiles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_PAYROLL_MANAGE')")
public class HrEmployeeProfileController {

    private final EmployeeProfileService employeeProfileService;
    private final HrDirectory directory;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmployeeProfileResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(employeeProfileService.listStaffWithProfiles()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<EmployeeProfileResponse>> get(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(employeeProfileService.getByUser(userId)));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<EmployeeProfileResponse>> upsert(
            @PathVariable UUID userId,
            @Valid @RequestBody EmployeeProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                employeeProfileService.upsert(userId, request, actorId), "Đã lưu hồ sơ lương"));
    }
}
