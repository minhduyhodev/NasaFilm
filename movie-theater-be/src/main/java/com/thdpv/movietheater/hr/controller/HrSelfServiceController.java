package com.thdpv.movietheater.hr.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.request.LeaveRequestCreateRequest;
import com.thdpv.movietheater.hr.dto.request.ShiftActionRequest;
import com.thdpv.movietheater.hr.dto.request.SwapCreateRequest;
import com.thdpv.movietheater.hr.dto.response.AttendanceResponse;
import com.thdpv.movietheater.hr.dto.response.CheckpointCodeResponse;
import com.thdpv.movietheater.hr.dto.response.LeaveRequestResponse;
import com.thdpv.movietheater.hr.dto.response.MyHrOverviewResponse;
import com.thdpv.movietheater.hr.dto.response.PayslipResponse;
import com.thdpv.movietheater.hr.dto.response.ShiftAssignmentResponse;
import com.thdpv.movietheater.hr.dto.response.ShiftSwapRequestResponse;
import com.thdpv.movietheater.hr.service.AttendanceService;
import com.thdpv.movietheater.hr.service.CheckpointCodeService;
import com.thdpv.movietheater.hr.service.HrDirectory;
import com.thdpv.movietheater.hr.service.HrSelfService;
import com.thdpv.movietheater.hr.service.LeaveRequestService;
import com.thdpv.movietheater.hr.service.PayrollService;
import com.thdpv.movietheater.hr.service.ShiftAssignmentService;
import com.thdpv.movietheater.hr.service.ShiftSwapService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Tự phục vụ cho nhân viên: xem lịch ca, check-in/out, xem phiếu lương của mình.
 */
@RestController
@RequestMapping("/api/hr/me")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class HrSelfServiceController {

    private final HrSelfService hrSelfService;
    private final ShiftAssignmentService shiftAssignmentService;
    private final AttendanceService attendanceService;
    private final PayrollService payrollService;
    private final LeaveRequestService leaveRequestService;
    private final ShiftSwapService shiftSwapService;
    private final HrDirectory directory;
    private final CheckpointCodeService checkpointCodeService;

    /**
     * Mã QR điểm danh hiển thị tại quầy — mọi nhân viên có thể mở trên tablet/màn hình quầy
     * để đồng nghiệp quét khi check-in/out (không phải mã cá nhân trên điện thoại nhân viên).
     */
    @GetMapping("/checkpoint-display")
    public ResponseEntity<ApiResponse<CheckpointCodeResponse>> checkpointDisplay() {
        return ResponseEntity.ok(ApiResponse.success(checkpointCodeService.currentDisplay()));
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<MyHrOverviewResponse>> overview(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(hrSelfService.overview(userId)));
    }

    @GetMapping("/shifts")
    public ResponseEntity<ApiResponse<List<ShiftAssignmentResponse>>> myShifts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(shiftAssignmentService.list(from, to, userId)));
    }

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> myAttendance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(attendanceService.listForUser(userId, from, to)));
    }

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkIn(
            @Valid @RequestBody ShiftActionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.checkIn(userId, request.shiftAssignmentUuid(), request.verificationCode()),
                "Đã check-in ca làm"));
    }

    @PostMapping("/check-out")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkOut(
            @Valid @RequestBody ShiftActionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.checkOut(userId, request.shiftAssignmentUuid(), request.verificationCode()),
                "Đã check-out ca làm"));
    }

    @GetMapping("/payslips")
    public ResponseEntity<ApiResponse<List<PayslipResponse>>> myPayslips(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.listMyPayslips(userId)));
    }

    @GetMapping("/payslips/{uuid}")
    public ResponseEntity<ApiResponse<PayslipResponse>> myPayslip(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(payrollService.getMyPayslip(userId, uuid)));
    }

    // ----- Nghỉ phép -----

    @GetMapping("/leave-requests")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> myLeaves(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(leaveRequestService.listMine(userId)));
    }

    @PostMapping("/leave-requests")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> createLeave(
            @Valid @RequestBody LeaveRequestCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                leaveRequestService.create(userId, request), "Đã gửi đơn nghỉ phép"));
    }

    @PostMapping("/leave-requests/{uuid}/cancel")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> cancelLeave(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                leaveRequestService.cancelMine(userId, uuid), "Đã hủy đơn nghỉ phép"));
    }

    // ----- Đổi ca -----

    @GetMapping("/swap-requests")
    public ResponseEntity<ApiResponse<List<ShiftSwapRequestResponse>>> mySwaps(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(shiftSwapService.listMine(userId)));
    }

    @GetMapping("/swap-candidates")
    public ResponseEntity<ApiResponse<List<ShiftAssignmentResponse>>> swapCandidates(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                shiftAssignmentService.listSwapCandidates(userId, from, to)));
    }

    @PostMapping("/swap-requests")
    public ResponseEntity<ApiResponse<ShiftSwapRequestResponse>> createSwap(
            @Valid @RequestBody SwapCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                shiftSwapService.create(userId, request), "Đã gửi yêu cầu đổi ca"));
    }

    @PostMapping("/swap-requests/{uuid}/cancel")
    public ResponseEntity<ApiResponse<ShiftSwapRequestResponse>> cancelSwap(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                shiftSwapService.cancelMine(userId, uuid), "Đã hủy yêu cầu đổi ca"));
    }
}
