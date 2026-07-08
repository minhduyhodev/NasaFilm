package com.thdpv.movietheater.support.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.service.SupportLiveSupportService;

@RestController
@RequestMapping("/api/admin/support-live")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('SUPPORT_MANAGE')")
public class AdminLiveSupportController {

    private final SupportLiveSupportService supportLiveSupportService;

    public AdminLiveSupportController(SupportLiveSupportService supportLiveSupportService) {
        this.supportLiveSupportService = supportLiveSupportService;
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<SupportTicketResponse>>> pending() {
        return ResponseEntity.ok(ApiResponse.success(supportLiveSupportService.listPendingLiveRequests()));
    }

    @PostMapping("/{ticketCode}/accept")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> accept(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success(
                supportLiveSupportService.acceptLiveSupport(ticketCode, userDetails.getUsername())));
    }

    @PostMapping("/{ticketCode}/reject")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> reject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success(
                supportLiveSupportService.rejectLiveSupport(ticketCode, userDetails.getUsername())));
    }

    @DeleteMapping("/{ticketCode}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable String ticketCode) {
        supportLiveSupportService.deleteTicket(ticketCode);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa ticket hỗ trợ."));
    }
}
