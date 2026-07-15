package com.thdpv.movietheater.hr.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
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
import com.thdpv.movietheater.hr.dto.request.ShiftAssignmentBulkRequest;
import com.thdpv.movietheater.hr.dto.request.ShiftAssignmentCreateRequest;
import com.thdpv.movietheater.hr.dto.response.ShiftAssignmentResponse;
import com.thdpv.movietheater.hr.service.HrDirectory;
import com.thdpv.movietheater.hr.service.ShiftAssignmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Xếp ca cho nhân viên (Admin / người có quyền HR_SHIFT_MANAGE).
 */
@RestController
@RequestMapping("/api/hr/admin/assignments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_SHIFT_MANAGE')")
public class HrScheduleController {

    private final ShiftAssignmentService shiftAssignmentService;
    private final HrDirectory directory;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShiftAssignmentResponse>>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(shiftAssignmentService.list(from, to, userId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShiftAssignmentResponse>> assign(
            @Valid @RequestBody ShiftAssignmentCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(shiftAssignmentService.assign(request, actorId),
                "Đã xếp ca cho nhân viên"));
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<ShiftAssignmentResponse>>> assignBulk(
            @Valid @RequestBody ShiftAssignmentBulkRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        List<ShiftAssignmentResponse> created = shiftAssignmentService.assignBulk(request, actorId);
        return ResponseEntity.ok(ApiResponse.success(created,
                "Đã xếp " + created.size() + " lượt ca"));
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID uuid) {
        shiftAssignmentService.delete(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa phân ca"));
    }
}
