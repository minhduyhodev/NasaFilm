package com.thdpv.movietheater.staff.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.staff.dto.response.StaffCheckInResponse;
import com.thdpv.movietheater.staff.dto.response.StaffGateEventResponse;
import com.thdpv.movietheater.staff.dto.response.StaffShowtimeStatsResponse;
import com.thdpv.movietheater.staff.dto.response.StaffShowtimeSummaryResponse;
import com.thdpv.movietheater.staff.service.StaffMissionControlService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class StaffMissionControlController {

    private final StaffMissionControlService staffMissionControlService;

    @GetMapping("/showtimes")
    public ResponseEntity<ApiResponse<List<StaffShowtimeSummaryResponse>>> listOperationalShowtimes() {
        return ResponseEntity.ok(ApiResponse.success(staffMissionControlService.listOperationalShowtimes()));
    }

    @GetMapping("/showtimes/{showtimeUuid}/stats")
    public ResponseEntity<ApiResponse<StaffShowtimeStatsResponse>> getShowtimeStats(
            @PathVariable UUID showtimeUuid) {
        return ResponseEntity.ok(ApiResponse.success(staffMissionControlService.getShowtimeStats(showtimeUuid)));
    }

    @GetMapping("/showtimes/{showtimeUuid}/gate-events")
    public ResponseEntity<ApiResponse<List<StaffGateEventResponse>>> listGateEvents(
            @PathVariable UUID showtimeUuid,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                staffMissionControlService.listRecentGateEvents(showtimeUuid, limit)));
    }

    @GetMapping("/tickets/{code}/preview")
    public ResponseEntity<ApiResponse<StaffCheckInResponse>> previewTicket(
            @PathVariable("code") String code,
            @RequestParam(required = false) String scanSource,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                staffMissionControlService.previewTicket(code, actorEmail(userDetails), scanSource)));
    }

    @PutMapping("/tickets/{code}/check-in")
    public ResponseEntity<ApiResponse<StaffCheckInResponse>> checkInTicket(
            @PathVariable("code") String code,
            @RequestParam(required = false) String scanSource,
            @AuthenticationPrincipal UserDetails userDetails) {
        StaffCheckInResponse response = staffMissionControlService.checkInTicket(
                code, actorEmail(userDetails), scanSource);
        String message = response.alreadyCheckedIn() && response.checkedInAt() != null
                ? "Vé đã được soát trước đó"
                : "Welcome aboard — Soát vé thành công";
        return ResponseEntity.ok(ApiResponse.success(response, message));
    }

    private String actorEmail(UserDetails userDetails) {
        return userDetails != null ? userDetails.getUsername() : null;
    }
}
