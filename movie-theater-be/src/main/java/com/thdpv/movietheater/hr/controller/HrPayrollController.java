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
import com.thdpv.movietheater.hr.dto.request.AdjustmentRequest;
import com.thdpv.movietheater.hr.dto.request.PayrollPeriodCreateRequest;
import com.thdpv.movietheater.hr.dto.response.AdjustmentResponse;
import com.thdpv.movietheater.hr.dto.response.PayrollPeriodResponse;
import com.thdpv.movietheater.hr.dto.response.PayslipResponse;
import com.thdpv.movietheater.hr.service.HrDirectory;
import com.thdpv.movietheater.hr.service.PayrollService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Quản lý kỳ lương, phiếu lương, thưởng & khấu trừ (Admin / HR_PAYROLL_MANAGE).
 */
@RestController
@RequestMapping("/api/hr/admin/payroll")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_PAYROLL_MANAGE')")
public class HrPayrollController {

    private final PayrollService payrollService;
    private final HrDirectory directory;

    @GetMapping("/periods")
    public ResponseEntity<ApiResponse<List<PayrollPeriodResponse>>> listPeriods() {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPeriods()));
    }

    @PostMapping("/periods")
    public ResponseEntity<ApiResponse<PayrollPeriodResponse>> createPeriod(
            @Valid @RequestBody PayrollPeriodCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.createPeriod(request, actorId),
                "Đã tạo kỳ lương"));
    }

    @PostMapping("/periods/{uuid}/generate")
    public ResponseEntity<ApiResponse<PayrollPeriodResponse>> generate(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.generate(uuid, actorId),
                "Đã sinh phiếu lương nháp"));
    }

    @PostMapping("/periods/{uuid}/approve")
    public ResponseEntity<ApiResponse<PayrollPeriodResponse>> approve(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.approve(uuid, actorId),
                "Đã duyệt kỳ lương"));
    }

    @PostMapping("/periods/{uuid}/pay")
    public ResponseEntity<ApiResponse<PayrollPeriodResponse>> pay(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.markPaid(uuid, actorId),
                "Đã chi trả kỳ lương"));
    }

    @DeleteMapping("/periods/{uuid}")
    public ResponseEntity<ApiResponse<Void>> deletePeriod(@PathVariable UUID uuid) {
        payrollService.deletePeriod(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa kỳ lương"));
    }

    @GetMapping("/periods/{uuid}/payslips")
    public ResponseEntity<ApiResponse<List<PayslipResponse>>> listPayslips(@PathVariable UUID uuid) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPayslips(uuid)));
    }

    @GetMapping("/adjustments")
    public ResponseEntity<ApiResponse<List<AdjustmentResponse>>> listAdjustments(
            @RequestParam UUID periodId) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listAdjustments(periodId)));
    }

    @PostMapping("/adjustments")
    public ResponseEntity<ApiResponse<AdjustmentResponse>> addAdjustment(
            @Valid @RequestBody AdjustmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.addAdjustment(request, actorId),
                "Đã thêm khoản điều chỉnh"));
    }

    @DeleteMapping("/adjustments/{uuid}")
    public ResponseEntity<ApiResponse<Void>> deleteAdjustment(@PathVariable UUID uuid) {
        payrollService.deleteAdjustment(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa khoản điều chỉnh"));
    }
}
