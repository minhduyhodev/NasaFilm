package com.thdpv.movietheater.support.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.dto.request.SupportTicketCreateRequest;
import com.thdpv.movietheater.support.dto.request.SupportTicketMessageRequest;
import com.thdpv.movietheater.support.dto.response.SupportTicketMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.service.SupportAiService;
import com.thdpv.movietheater.support.service.SupportTicketService;
import com.thdpv.movietheater.support.support.SupportActionRateLimiter;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class SupportController {

    private final SupportAiService supportAiService;
    private final SupportTicketService supportTicketService;
    private final SupportActionRateLimiter supportActionRateLimiter;

    public SupportController(
            SupportAiService supportAiService,
            SupportTicketService supportTicketService,
            SupportActionRateLimiter supportActionRateLimiter) {
        this.supportAiService = supportAiService;
        this.supportTicketService = supportTicketService;
        this.supportActionRateLimiter = supportActionRateLimiter;
    }

    @PostMapping("/support-ai/chat")
    public ResponseEntity<ApiResponse<SupportAiResponse>> chat(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SupportAiRequest request) {
        String userKey = userDetails != null ? userDetails.getUsername() : "anonymous";
        supportActionRateLimiter.assertAiChatAllowed(userKey);

        var history = request.history() == null ? List.<SupportAiService.SupportAiMessage>of() : request.history().stream()
                .map(item -> new SupportAiService.SupportAiMessage(item.role(), item.content()))
                .toList();
        var result = supportAiService.chat(request.message(), history, request.mode());

        // Auto-create ticket if AI produced a ticketAction
        SupportTicketResponse createdTicket = null;
        if (result.ticketAction() != null && userDetails != null) {
            var ticketReq = new SupportTicketCreateRequest();
            ticketReq.setCategory(result.ticketAction().category());
            ticketReq.setDescription(result.ticketAction().description());
            try {
                createdTicket = supportTicketService.create(userDetails.getUsername(), ticketReq);
            } catch (Exception e) {
                // If user already has an active ticket, just ignore auto-create
            }
        }

        return ResponseEntity.ok(ApiResponse.success(SupportAiResponse.of(
                result.reply(),
                result.suggestedCategory(),
                createdTicket != null ? createdTicket.getTicketCode() : null,
                createdTicket,
                result.choices())));
    }

    @GetMapping("/support-ai/status")
    public ResponseEntity<ApiResponse<SupportAiStatusResponse>> getSupportAiStatus() {
        return ResponseEntity.ok(ApiResponse.success(
                new SupportAiStatusResponse(supportAiService.isConfigured(), supportAiService.getRuntimeMode())));
    }

    @PostMapping("/support-requests")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SupportTicketCreateRequest request) {
        supportActionRateLimiter.assertTicketCreateAllowed(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(supportTicketService.create(userDetails.getUsername(), request)));
    }

    @GetMapping("/support-requests/my")
    public ResponseEntity<ApiResponse<List<SupportTicketResponse>>> myTickets(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(supportTicketService.listMine(userDetails.getUsername())));
    }

    @GetMapping("/support-requests/{ticketCode}")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> getMine(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        var ticket = supportTicketService.getByCode(ticketCode);
        if (!ticket.getOwnerEmail().equalsIgnoreCase(userDetails.getUsername())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(ErrorCode.FORBIDDEN, "Bạn không có quyền xem ticket này."));
        }
        return ResponseEntity.ok(ApiResponse.success(ticket));
    }

    @GetMapping("/support-requests/{ticketCode}/messages")
    public ResponseEntity<ApiResponse<List<SupportTicketMessageResponse>>> getMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        var ticket = supportTicketService.getByCode(ticketCode);
        if (!ticket.getOwnerEmail().equalsIgnoreCase(userDetails.getUsername())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(ErrorCode.FORBIDDEN, "Bạn không có quyền xem ticket này."));
        }
        return ResponseEntity.ok(ApiResponse.success(supportTicketService.listMessages(ticketCode)));
    }

    @PostMapping("/support-requests/{ticketCode}/messages")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> replyMine(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode,
            @Valid @RequestBody SupportTicketMessageRequest request) {
        supportActionRateLimiter.assertTicketMessageAllowed(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                supportTicketService.addUserMessage(ticketCode, userDetails.getUsername(), request.getMessage())));
    }

    public record SupportAiRequest(String message, List<SupportAiMessageRequest> history, String mode) {}

    public record SupportAiMessageRequest(String role, String content) {}

    public record SupportAiResponse(String reply, String suggestedCategory, String autoTicketCode, SupportTicketResponse autoTicket, List<Map<String, String>> choices) {
        public static SupportAiResponse of(String reply, String suggestedCategory, String autoTicketCode, SupportTicketResponse autoTicket, List<SupportAiService.ChoiceButton> choiceButtons) {
            List<Map<String, String>> choiceList = null;
            if (choiceButtons != null) {
                choiceList = new ArrayList<>();
                for (var c : choiceButtons) {
                    choiceList.add(Map.of("text", c.text(), "value", c.value()));
                }
            }
            return new SupportAiResponse(reply, suggestedCategory, autoTicketCode, autoTicket, choiceList);
        }
    }

    public record SupportAiStatusResponse(boolean configured, String mode) {}
}
