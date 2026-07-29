package com.thdpv.movietheater.support.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.dto.request.SupportTicketCreateRequest;
import com.thdpv.movietheater.support.dto.request.SupportTicketMessageRequest;
import com.thdpv.movietheater.support.dto.response.SupportAiMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportAiSessionResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.service.SupportAiContextService;
import com.thdpv.movietheater.support.service.SupportAiService;
import com.thdpv.movietheater.support.service.SupportAiSessionService;
import com.thdpv.movietheater.support.service.SupportChatPenaltyService;
import com.thdpv.movietheater.support.service.SupportTicketService;
import com.thdpv.movietheater.support.support.SupportActionRateLimiter;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class SupportController {

    private final SupportAiService supportAiService;
    private final SupportTicketService supportTicketService;
    private final SupportAiSessionService supportAiSessionService;
    private final SupportAiContextService supportAiContextService;
    private final SupportActionRateLimiter supportActionRateLimiter;
    private final SupportChatPenaltyService supportChatPenaltyService;

    public SupportController(
            SupportAiService supportAiService,
            SupportTicketService supportTicketService,
            SupportAiSessionService supportAiSessionService,
            SupportAiContextService supportAiContextService,
            SupportActionRateLimiter supportActionRateLimiter,
            SupportChatPenaltyService supportChatPenaltyService) {
        this.supportAiService = supportAiService;
        this.supportTicketService = supportTicketService;
        this.supportAiSessionService = supportAiSessionService;
        this.supportAiContextService = supportAiContextService;
        this.supportActionRateLimiter = supportActionRateLimiter;
        this.supportChatPenaltyService = supportChatPenaltyService;
    }

    @PostMapping("/support-ai/chat")
    public ResponseEntity<ApiResponse<SupportAiResponse>> chat(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SupportAiRequest request) {
        String userKey = userDetails != null ? userDetails.getUsername() : "anonymous";
        if (userDetails != null) {
            supportChatPenaltyService.assertChatAllowed(userKey);
        }
        supportActionRateLimiter.assertAiChatAllowed(userKey);

        var history = request.history() == null ? List.<SupportAiService.SupportAiMessage>of() : request.history().stream()
                .map(item -> new SupportAiService.SupportAiMessage(item.role(), item.content()))
                .toList();
        String ownerEmail = userDetails != null ? userDetails.getUsername() : null;
        var result = supportAiService.chat(
                request.message(),
                history,
                request.mode(),
                ownerEmail);

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

        // Persist the conversation server-side (chat lives in DB, not only in the browser).
        String sessionCode = request.sessionId();
        boolean answerMode = "ANSWER".equalsIgnoreCase(request.mode() == null ? "" : request.mode().trim());
        List<Map<String, String>> movies = List.of();
        String replyForClient = result.reply();
        if (answerMode && result.reply() != null) {
            try {
                movies = supportAiContextService.moviesMentionedIn(result.reply());
            } catch (Exception e) {
                movies = List.of();
            }
            // Posters carry the catalog; drop redundant bullet lines from the bubble text.
            if (!movies.isEmpty()) {
                replyForClient = SupportAiService.stripMovieCatalogLines(result.reply());
            }
        }

        if (ownerEmail != null) {
            try {
                List<Map<String, String>> choiceList = null;
                if (result.choices() != null) {
                    choiceList = new ArrayList<>();
                    for (var c : result.choices()) {
                        choiceList.add(Map.of("text", c.text(), "value", c.value()));
                    }
                }
                var session = supportAiSessionService.recordExchange(
                        request.sessionId(),
                        ownerEmail,
                        null,
                        request.mode(),
                        request.message(),
                        replyForClient,
                        choiceList);
                if (session != null) {
                    sessionCode = session.getSessionCode();
                }
            } catch (Exception e) {
                // Persistence must never break the chat response.
            }
        }

        return ResponseEntity.ok(ApiResponse.success(SupportAiResponse.of(
                replyForClient,
                result.suggestedCategory(),
                createdTicket != null ? createdTicket.getTicketCode() : null,
                createdTicket,
                result.choices(),
                sessionCode,
                movies)));
    }

    @GetMapping("/support-ai/sessions")
    public ResponseEntity<ApiResponse<List<SupportAiSessionResponse>>> myAiSessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        return ResponseEntity.ok(ApiResponse.success(
                supportAiSessionService.listMine(userDetails.getUsername())));
    }

    @GetMapping("/support-ai/sessions/{sessionCode}/messages")
    public ResponseEntity<ApiResponse<List<SupportAiMessageResponse>>> aiSessionMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String sessionCode) {
        String ownerEmail = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(ApiResponse.success(
                supportAiSessionService.listMessages(sessionCode, ownerEmail)));
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
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ErrorCode.FORBIDDEN, "Bạn không có quyền xem ticket này."));
        }
        return ResponseEntity.ok(ApiResponse.success(ticket));
    }

    @GetMapping("/support-requests/{ticketCode}/messages")
    public ResponseEntity<ApiResponse<List<SupportTicketMessageResponse>>> getMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        var ticket = supportTicketService.getByCode(ticketCode);
        if (!ticket.getOwnerEmail().equalsIgnoreCase(userDetails.getUsername())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ErrorCode.FORBIDDEN, "Bạn không có quyền xem ticket này."));
        }
        return ResponseEntity.ok(ApiResponse.success(supportTicketService.listMessages(ticketCode)));
    }

    @PostMapping(value = "/support-requests/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<List<String>>> uploadImages(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("files") MultipartFile[] files) {
        supportActionRateLimiter.assertTicketMessageAllowed(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                supportTicketService.uploadUserImages(userDetails.getUsername(), files)));
    }

    @PostMapping("/support-requests/{ticketCode}/messages")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> replyMine(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode,
            @Valid @RequestBody SupportTicketMessageRequest request) {
        supportActionRateLimiter.assertTicketMessageAllowed(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(
                supportTicketService.addUserMessage(
                        ticketCode,
                        userDetails.getUsername(),
                        request.getMessage(),
                        request.getImageUrls())));
    }

    @PostMapping("/support-requests/{ticketCode}/cancel")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> cancelMine(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketCode) {
        return ResponseEntity.ok(ApiResponse.success(
                supportTicketService.cancelByOwner(ticketCode, userDetails.getUsername())));
    }

    public record SupportAiRequest(String message, List<SupportAiMessageRequest> history, String mode, String sessionId) {}

    public record SupportAiMessageRequest(String role, String content) {
    }

    public record SupportAiResponse(
            String reply,
            String suggestedCategory,
            String autoTicketCode,
            SupportTicketResponse autoTicket,
            List<Map<String, String>> choices,
            String sessionId,
            List<Map<String, String>> movies) {
        public static SupportAiResponse of(
                String reply,
                String suggestedCategory,
                String autoTicketCode,
                SupportTicketResponse autoTicket,
                List<SupportAiService.ChoiceButton> choiceButtons,
                String sessionId,
                List<Map<String, String>> movies) {
            List<Map<String, String>> choiceList = null;
            if (choiceButtons != null) {
                choiceList = new ArrayList<>();
                for (var c : choiceButtons) {
                    choiceList.add(Map.of("text", c.text(), "value", c.value()));
                }
            }
            return new SupportAiResponse(
                    reply,
                    suggestedCategory,
                    autoTicketCode,
                    autoTicket,
                    choiceList,
                    sessionId,
                    movies == null ? List.of() : movies);
        }
    }

    public record SupportAiStatusResponse(boolean configured, String mode) {
    }
}
