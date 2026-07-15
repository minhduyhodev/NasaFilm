package com.thdpv.movietheater.hr.controller;

import java.util.List;
import java.util.UUID;

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
import com.thdpv.movietheater.hr.dto.request.ReviewDecisionRequest;
import com.thdpv.movietheater.hr.dto.response.LeaveRequestResponse;
import com.thdpv.movietheater.hr.dto.response.ShiftSwapRequestResponse;
import com.thdpv.movietheater.hr.enums.RequestStatus;
import com.thdpv.movietheater.hr.service.HrDirectory;
import com.thdpv.movietheater.hr.service.LeaveRequestService;
import com.thdpv.movietheater.hr.service.ShiftSwapService;

import lombok.RequiredArgsConstructor;

/**
 * Duyệt đơn từ HR (nghỉ phép, đổi ca) — Admin / HR_SHIFT_MANAGE.
 */
@RestController
@RequestMapping("/api/hr/admin/requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasAuthority('HR_SHIFT_MANAGE')")
public class HrRequestAdminController {

    private final LeaveRequestService leaveRequestService;
    private final ShiftSwapService shiftSwapService;
    private final HrDirectory directory;

    // ----- Nghỉ phép -----

    @GetMapping("/leave")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> leaves(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(leaveRequestService.search(status, userId)));
    }

    @PostMapping("/leave/{uuid}/approve")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> approveLeave(
            @PathVariable UUID uuid,
            @RequestBody(required = false) ReviewDecisionRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                leaveRequestService.approve(uuid, actorId, note(body)), "Đã duyệt đơn nghỉ phép"));
    }

    @PostMapping("/leave/{uuid}/reject")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> rejectLeave(
            @PathVariable UUID uuid,
            @RequestBody(required = false) ReviewDecisionRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                leaveRequestService.reject(uuid, actorId, note(body)), "Đã từ chối đơn nghỉ phép"));
    }

    // ----- Đổi ca -----

    @GetMapping("/swap")
    public ResponseEntity<ApiResponse<List<ShiftSwapRequestResponse>>> swaps(
            @RequestParam(required = false) RequestStatus status) {
        return ResponseEntity.ok(ApiResponse.success(shiftSwapService.search(status)));
    }

    @PostMapping("/swap/{uuid}/approve")
    public ResponseEntity<ApiResponse<ShiftSwapRequestResponse>> approveSwap(
            @PathVariable UUID uuid,
            @RequestBody(required = false) ReviewDecisionRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                shiftSwapService.approve(uuid, actorId, note(body)), "Đã duyệt đổi ca"));
    }

    @PostMapping("/swap/{uuid}/reject")
    public ResponseEntity<ApiResponse<ShiftSwapRequestResponse>> rejectSwap(
            @PathVariable UUID uuid,
            @RequestBody(required = false) ReviewDecisionRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID actorId = directory.requireUserIdByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                shiftSwapService.reject(uuid, actorId, note(body)), "Đã từ chối đổi ca"));
    }

    private static String note(ReviewDecisionRequest body) {
        return body != null ? body.note() : null;
    }
}
