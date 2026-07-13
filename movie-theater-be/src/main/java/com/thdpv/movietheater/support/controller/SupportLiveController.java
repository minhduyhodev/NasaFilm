package com.thdpv.movietheater.support.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.support.dto.request.SupportLiveRequestCreateRequest;
import com.thdpv.movietheater.support.dto.request.SupportSatisfactionRequest;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.service.SupportLiveSupportService;
import com.thdpv.movietheater.support.support.SupportActionRateLimiter;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/support-live")
public class SupportLiveController {

    private final SupportLiveSupportService supportLiveSupportService;
    private final SupportActionRateLimiter supportActionRateLimiter;

    public SupportLiveController(
            SupportLiveSupportService supportLiveSupportService,
            SupportActionRateLimiter supportActionRateLimiter) {
        this.supportLiveSupportService = supportLiveSupportService;
        this.supportActionRateLimiter = supportActionRateLimiter;
    }

    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<SupportLiveSupportService.SupportLiveAvailability>> getAvailability() {
        return ResponseEntity.ok(ApiResponse.success(supportLiveSupportService.getAvailability()));
    }

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> requestLiveSupport(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SupportLiveRequestCreateRequest request) {
        supportActionRateLimiter.assertTicketCreateAllowed(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(supportLiveSupportService.requestLiveSupport(userDetails.getUsername(), request)));
    }

    @PostMapping("/{ticketCode}/satisfaction")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> submitSatisfaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode,
            @Valid @RequestBody SupportSatisfactionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                supportLiveSupportService.rateSatisfaction(ticketCode, userDetails.getUsername(), request.getRating())));
    }

    @PostMapping("/{ticketCode}/fallback")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> fallbackToTicket(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success(
                supportLiveSupportService.fallbackLiveToTicket(ticketCode, userDetails.getUsername())));
    }
}
