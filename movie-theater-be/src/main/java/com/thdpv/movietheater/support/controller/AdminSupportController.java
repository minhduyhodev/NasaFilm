package com.thdpv.movietheater.support.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.support.dto.request.SupportTicketMessageRequest;
import com.thdpv.movietheater.support.dto.request.SupportTicketStatusRequest;
import com.thdpv.movietheater.support.dto.response.SupportTicketMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.service.SupportTicketService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/support")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('SUPPORT_MANAGE')")
public class AdminSupportController {

    private final SupportTicketService supportTicketService;

    public AdminSupportController(SupportTicketService supportTicketService) {
        this.supportTicketService = supportTicketService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<?>> listAll(
            @RequestParam(value = "unpaged", required = false, defaultValue = "false") boolean unpaged,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        if (unpaged) {
            return ResponseEntity.ok(ApiResponse.success(supportTicketService.listAll()));
        }
        Page<SupportTicketResponse> page = supportTicketService.listAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/{ticketCode}")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> detail(@PathVariable String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success(supportTicketService.getByCode(ticketCode)));
    }

    @GetMapping("/{ticketCode}/messages")
    public ResponseEntity<ApiResponse<List<SupportTicketMessageResponse>>> messages(@PathVariable String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success(supportTicketService.listMessages(ticketCode)));
    }

    @PostMapping("/{ticketCode}/messages")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> reply(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode,
            @Valid @RequestBody SupportTicketMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                supportTicketService.addAdminMessage(ticketCode, userDetails.getUsername(), request.getMessage(), request.getStatus())));
    }

    @PatchMapping("/{ticketCode}/status")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> updateStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode,
            @RequestBody SupportTicketStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                supportTicketService.updateStatus(ticketCode, request.getStatus(), userDetails.getUsername())));
    }

    @DeleteMapping("/{ticketCode}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable String ticketCode) {
        supportTicketService.delete(ticketCode);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa ticket hỗ trợ."));
    }
}
