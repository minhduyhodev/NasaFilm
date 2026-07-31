package com.thdpv.movietheater.hr.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.request.HolidayRequest;
import com.thdpv.movietheater.hr.dto.response.HolidayResponse;
import com.thdpv.movietheater.hr.service.HolidayService;
import com.thdpv.movietheater.hr.service.HrDirectory;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Quản lý danh sách ngày lễ (Admin / HR_PAYROLL_MANAGE).
 */
@RestController
@RequestMapping("/api/hr/admin/holidays")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('HR_HOLIDAY_MANAGE','HR_PAYROLL_MANAGE')")
public class HrHolidayController {

    private final HolidayService holidayService;
    private final HrDirectory directory;

    @GetMapping
    public ResponseEntity<ApiResponse<List<HolidayResponse>>> list(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.list(year)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HolidayResponse>> create(
            @Valid @RequestBody HolidayRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(holidayService.create(request, actorId), "Đã thêm ngày lễ"));
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID uuid) {
        holidayService.delete(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa ngày lễ"));
    }
}
