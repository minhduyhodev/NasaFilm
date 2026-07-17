package com.thdpv.movietheater.support.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.dto.request.SupportTicketCreateRequest;
import com.thdpv.movietheater.support.dto.response.SupportTicketMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.entity.SupportTicket;
import com.thdpv.movietheater.support.entity.SupportTicketMessage;
import com.thdpv.movietheater.support.repository.SupportTicketMessageRepository;
import com.thdpv.movietheater.support.repository.SupportTicketRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class SupportTicketService {

    private static final Set<String> CLOSED_STATUSES = Set.of("DONE", "RESOLVED", "CLOSED");
    private static final String ACTIVE_TICKET_MESSAGE =
            "Khách hàng chỉ được gửi 1 ticket 1 lần cho đến khi hoàn thành.";

    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketMessageRepository supportTicketMessageRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SupportTicketService(
            SupportTicketRepository supportTicketRepository,
            SupportTicketMessageRepository supportTicketMessageRepository,
            UserRepository userRepository,
            ApplicationEventPublisher eventPublisher) {
        this.supportTicketRepository = supportTicketRepository;
        this.supportTicketMessageRepository = supportTicketMessageRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public SupportTicketResponse create(String ownerEmail, SupportTicketCreateRequest request) {
        assertNoActiveSupport(ownerEmail);
        SupportTicket ticket = new SupportTicket();
        ticket.setTicketCode(generateTicketCode());
        ticket.setOwnerEmail(ownerEmail);
        ticket.setOwnerName(userRepository.findByEmailIgnoreCase(ownerEmail).map(u -> u.getFullName()).orElse(null));
        ticket.setCategory(request.getCategory().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setStatus("PENDING");
        ticket.setReadByAdmin(false);
        ticket.setLastMessage(request.getDescription().trim());
        ticket.setLastMessageSender("USER");

        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "USER", saved.getOwnerName(), request.getDescription().trim());
        return map(saved);
    }

    @Transactional(readOnly = true)
    public void assertNoActiveSupport(String ownerEmail) {
        boolean hasActive = supportTicketRepository.findByOwnerEmailOrderByCreatedAtDesc(ownerEmail).stream()
                .anyMatch(ticket -> ticket != null && ticket.getStatus() != null
                        && !CLOSED_STATUSES.contains(ticket.getStatus().trim().toUpperCase()));
        if (hasActive) {
            throw new AppException(ErrorCode.BAD_REQUEST, ACTIVE_TICKET_MESSAGE);
        }
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listMine(String ownerEmail) {
        return supportTicketRepository.findByOwnerEmailOrderByCreatedAtDesc(ownerEmail)
                .stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listAll() {
        return supportTicketRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<SupportTicketResponse> listAll(Pageable pageable) {
        return supportTicketRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::map);
    }

    @Transactional(readOnly = true)
    public SupportTicketResponse getByCode(String ticketCode) {
        return supportTicketRepository.findByTicketCode(ticketCode)
                .map(this::map)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
    }

    @Transactional(readOnly = true)
    public List<SupportTicketMessageResponse> listMessages(String ticketCode) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        return supportTicketMessageRepository.findByTicketUuidOrderByCreatedAtAsc(ticket.getUuid())
                .stream()
                .map(this::mapMessage)
                .toList();
    }

    @Transactional
    public SupportTicketResponse addUserMessage(String ticketCode, String ownerEmail, String message) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền gửi vào ticket này.");
        }
        String status = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase();
        if (CLOSED_STATUSES.contains(status)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ticket đã đóng, không thể gửi thêm tin nhắn.");
        }
        ticket.setLastMessage(message.trim());
        ticket.setLastMessageSender("USER");
        ticket.setReadByAdmin(false);
        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "USER", saved.getOwnerName(), message.trim());
        return map(saved);
    }

    @Transactional
    public SupportTicketResponse addAdminMessage(String ticketCode, String adminEmail, String message, String status) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        String adminDisplayName = resolveUserDisplayName(adminEmail);
        String trimmedMessage = message.trim();
        String lastMessagePreview = resolveLastMessagePreview(trimmedMessage);
        ticket.setLastMessage(lastMessagePreview);
        ticket.setLastMessageSender("ADMIN");
        ticket.setReadByAdmin(true);
        if (status != null && !status.isBlank()) {
            ticket.setStatus(status.trim().toUpperCase());
        }
        ticket.setAnswer(lastMessagePreview);
        if (ticket.getAssignedStaffName() == null || ticket.getAssignedStaffName().isBlank()) {
            ticket.setAssignedStaffEmail(adminEmail != null ? adminEmail.trim().toLowerCase() : null);
            ticket.setAssignedStaffName(adminDisplayName);
        }
        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "ADMIN", adminDisplayName, trimmedMessage);
        return map(saved);
    }

    @Transactional
    public SupportTicketResponse cancelByOwner(String ticketCode, String ownerEmail) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền hủy ticket này.");
        }
        String status = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase();
        if (CLOSED_STATUSES.contains(status)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ticket đã đóng, không thể hủy thêm.");
        }
        ticket.setStatus("CLOSED");
        ticket.setLiveRequested(false);
        ticket.setLiveConnected(false);
        ticket.setReadByAdmin(false);
        ticket.setLastMessage("Khách đã hủy yêu cầu hỗ trợ.");
        ticket.setLastMessageSender("USER");
        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "SYSTEM", "NASA BOT", "Khách đã hủy yêu cầu hỗ trợ này.");
        return map(saved);
    }

    @Transactional
    public SupportTicketResponse updateStatus(String ticketCode, String status) {
        return updateStatus(ticketCode, status, null);
    }

    @Transactional
    public SupportTicketResponse updateStatus(String ticketCode, String status, String adminEmail) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        String nextStatus = status.trim().toUpperCase();
        ticket.setStatus(nextStatus);
        if ("IN_PROGRESS".equals(nextStatus) && adminEmail != null && !adminEmail.isBlank()) {
            ticket.setReadByAdmin(true);
            if (ticket.getAssignedStaffName() == null || ticket.getAssignedStaffName().isBlank()) {
                ticket.setAssignedStaffEmail(adminEmail.trim().toLowerCase());
                ticket.setAssignedStaffName(resolveUserDisplayName(adminEmail));
            }
        }
        SupportTicket saved = supportTicketRepository.save(ticket);
        if ("IN_PROGRESS".equals(nextStatus)) {
            eventPublisher.publishEvent(new SupportTicketEvent(saved.getTicketCode(), "ADMIN"));
        }
        return map(saved);
    }

    @Transactional
    public void delete(String ticketCode) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        supportTicketMessageRepository.deleteByTicketUuid(ticket.getUuid());
        supportTicketRepository.delete(ticket);
        eventPublisher.publishEvent(new SupportTicketDeletedEvent(ticketCode));
    }

    void saveMessage(UUID ticketUuid, String senderRole, String senderName, String message) {
        SupportTicketMessage ticketMessage = new SupportTicketMessage();
        ticketMessage.setTicketUuid(ticketUuid);
        ticketMessage.setSenderRole(senderRole);
        ticketMessage.setSenderName(senderName);
        ticketMessage.setMessage(message);
        supportTicketMessageRepository.save(ticketMessage);
        eventPublisher.publishEvent(new SupportTicketEvent(getTicketCodeByUuid(ticketUuid), senderRole));
    }

    SupportTicketResponse map(SupportTicket ticket) {
        SupportTicketResponse response = new SupportTicketResponse();
        response.setUuid(ticket.getUuid());
        response.setTicketCode(ticket.getTicketCode());
        response.setOwnerEmail(ticket.getOwnerEmail());
        response.setOwnerName(ticket.getOwnerName());
        response.setCategory(ticket.getCategory());
        response.setDescription(ticket.getDescription());
        response.setStatus(ticket.getStatus());
        response.setReadByAdmin(ticket.isReadByAdmin());
        response.setReplied(ticket.getAnswer() != null && !ticket.getAnswer().isBlank());
        response.setAnswer(ticket.getAnswer());
        response.setAdminNote(ticket.getAdminNote());
        response.setLastMessage(ticket.getLastMessage());
        response.setLastMessageSender(ticket.getLastMessageSender());
        response.setLiveRequested(ticket.isLiveRequested());
        response.setLiveConnected(ticket.isLiveConnected());
        response.setAssignedStaffEmail(ticket.getAssignedStaffEmail());
        response.setAssignedStaffName(ticket.getAssignedStaffName());
        response.setSatisfactionRating(ticket.getSatisfactionRating());
        response.setSatisfactionLabel(ticket.getSatisfactionLabel());
        response.setCreatedAt(ticket.getCreatedAt());
        response.setUpdatedAt(ticket.getUpdatedAt());
        return response;
    }

    private SupportTicketMessageResponse mapMessage(SupportTicketMessage message) {
        SupportTicketMessageResponse response = new SupportTicketMessageResponse();
        response.setUuid(message.getUuid());
        response.setTicketUuid(message.getTicketUuid());
        response.setSenderRole(message.getSenderRole());
        response.setSenderName(message.getSenderName());
        response.setMessage(message.getMessage());
        response.setCreatedAt(message.getCreatedAt());
        return response;
    }

    String generateTicketCode() {
        String code;
        do {
            code = "SR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (supportTicketRepository.existsByTicketCode(code));
        return code;
    }

    private String getTicketCodeByUuid(UUID uuid) {
        return supportTicketRepository.findById(uuid).map(SupportTicket::getTicketCode).orElse(null);
    }

    private String resolveUserDisplayName(String email) {
        if (email == null || email.isBlank()) {
            return "Staff";
        }
        String normalizedEmail = email.trim();
        return userRepository.findByEmailIgnoreCase(normalizedEmail)
                .map(user -> {
                    String fullName = user.getFullName();
                    if (fullName != null && !fullName.isBlank()) {
                        return fullName.trim();
                    }
                    return normalizedEmail;
                })
                .orElse(normalizedEmail);
    }

    private String resolveLastMessagePreview(String message) {
        if (message != null && message.matches("\\[\\[sticker:[a-z0-9-]+\\]\\]")) {
            return "Nhãn cảm ơn từ staff";
        }
        return message;
    }

    public record SupportTicketEvent(String ticketCode, String senderRole) {}

    public record SupportTicketDeletedEvent(String ticketCode) {}
}
