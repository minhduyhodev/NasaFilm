package com.thdpv.movietheater.hr.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.hr.dto.request.AttendanceUpdateRequest;
import com.thdpv.movietheater.hr.dto.response.AttendanceResponse;
import com.thdpv.movietheater.hr.dto.response.CheckpointCodeResponse;
import com.thdpv.movietheater.hr.enums.ApprovalStatus;
import com.thdpv.movietheater.hr.service.AttendanceService;
import com.thdpv.movietheater.hr.service.CheckpointCodeService;
import com.thdpv.movietheater.hr.service.HrDirectory;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Quản lý & duyệt chấm công (Admin / HR_ATTENDANCE_MANAGE).
 */
@RestController
@RequestMapping("/api/hr/admin/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_ATTENDANCE_MANAGE')")
public class HrAttendanceAdminController {

    private final AttendanceService attendanceService;
    private final CheckpointCodeService checkpointCodeService;
    private final HrDirectory directory;

    @GetMapping("/checkpoint-code")
    public ResponseEntity<ApiResponse<CheckpointCodeResponse>> checkpointCode() {
        return ResponseEntity.ok(ApiResponse.success(checkpointCodeService.currentDisplay()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> search(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) ApprovalStatus approvalStatus) {
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.search(from, to, userId, approvalStatus)));
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @PathVariable UUID uuid,
            @Valid @RequestBody AttendanceUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.update(uuid, request, actorId), "Đã cập nhật chấm công"));
    }

    @PostMapping("/{uuid}/approve")
    public ResponseEntity<ApiResponse<AttendanceResponse>> approve(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.approve(uuid, actorId), "Đã duyệt chấm công"));
    }

    @PostMapping("/{uuid}/reject")
    public ResponseEntity<ApiResponse<AttendanceResponse>> reject(
            @PathVariable UUID uuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.reject(uuid, actorId), "Đã từ chối chấm công"));
    }

    @PostMapping("/scan-absent")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> scanAbsent() {
        int created = attendanceService.markAbsentForPastAssignments();
        return ResponseEntity.ok(ApiResponse.success(Map.of("created", created),
                "Đã đánh dấu vắng " + created + " ca"));
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> bulkApprove(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        int approved = attendanceService.bulkApprove(from, to, actorId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("approved", approved),
                "Đã duyệt " + approved + " chấm công"));
    }
}
