package com.thdpv.movietheater.support.service;

import java.util.List;
import java.util.Locale;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.support.dto.request.SupportLiveRequestCreateRequest;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.entity.SupportTicket;
import com.thdpv.movietheater.support.repository.SupportTicketRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class SupportLiveSupportService {

    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketService supportTicketService;
    private final UserRepository userRepository;
    private final SupportAgentPresenceService supportAgentPresenceService;
    private final ApplicationEventPublisher eventPublisher;

    public SupportLiveSupportService(
            SupportTicketRepository supportTicketRepository,
            SupportTicketService supportTicketService,
            UserRepository userRepository,
            SupportAgentPresenceService supportAgentPresenceService,
            ApplicationEventPublisher eventPublisher) {
        this.supportTicketRepository = supportTicketRepository;
        this.supportTicketService = supportTicketService;
        this.userRepository = userRepository;
        this.supportAgentPresenceService = supportAgentPresenceService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public SupportLiveAvailability getAvailability() {
        var agents = supportAgentPresenceService.getOnlineAgents().stream()
                .map(agent -> new SupportLiveAgent(agent.email(), agent.displayName()))
                .toList();
        return new SupportLiveAvailability(!agents.isEmpty(), agents);
    }

    @Transactional
    public SupportTicketResponse requestLiveSupport(String ownerEmail, SupportLiveRequestCreateRequest request) {
        if (!supportAgentPresenceService.hasOnlineAgents()) {
            throw new IllegalArgumentException("Hiện chưa có admin hoặc staff online để hỗ trợ trực tiếp.");
        }
        SupportTicket ticket = new SupportTicket();
        ticket.setTicketCode(supportTicketService.generateTicketCode());
        ticket.setOwnerEmail(ownerEmail);
        ticket.setOwnerName(userRepository.findByEmailIgnoreCase(ownerEmail).map(u -> u.getFullName()).orElse(ownerEmail));
        ticket.setCategory(request.getCategory().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setStatus("LIVE_REQUESTED");
        ticket.setLiveRequested(true);
        ticket.setLiveConnected(false);
        ticket.setReadByAdmin(false);
        ticket.setLastMessage(request.getDescription().trim());
        ticket.setLastMessageSender("USER");
        SupportTicket saved = supportTicketRepository.save(ticket);
        supportTicketService.saveMessage(saved.getUuid(), "USER", saved.getOwnerName(), request.getDescription().trim());
        eventPublisher.publishEvent(new SupportLiveEvent("LIVE_REQUESTED", saved.getTicketCode(), null, null));
        return supportTicketService.map(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listPendingLiveRequests() {
        return supportTicketRepository.findByLiveRequestedTrueOrderByCreatedAtAsc().stream()
                .filter(ticket -> !ticket.isLiveConnected())
                .map(supportTicketService::map)
                .toList();
    }

    @Transactional
    public SupportTicketResponse acceptLiveSupport(String ticketCode, String staffEmail) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.isLiveRequested()) {
            throw new IllegalArgumentException("Ticket này không phải yêu cầu chat trực tiếp.");
        }
        if (ticket.isLiveConnected()) {
            throw new IllegalArgumentException("Ticket này đã có nhân viên khác nhận hỗ trợ.");
        }
        if (!supportAgentPresenceService.isOnline(staffEmail)) {
            throw new IllegalArgumentException("Bạn cần online để nhận hỗ trợ realtime.");
        }
        String staffName = userRepository.findByEmailIgnoreCase(staffEmail).map(u -> u.getFullName()).orElse(staffEmail);
        ticket.setAssignedStaffEmail(staffEmail.trim().toLowerCase());
        ticket.setAssignedStaffName(staffName);
        ticket.setLiveConnected(true);
        ticket.setReadByAdmin(true);
        ticket.setStatus("IN_PROGRESS");
        SupportTicket saved = supportTicketRepository.save(ticket);
        supportTicketService.saveMessage(saved.getUuid(), "SYSTEM", "NASA BOT", staffName + " đã nhận hỗ trợ trực tiếp.");
        eventPublisher.publishEvent(new SupportLiveEvent("LIVE_ACCEPTED", saved.getTicketCode(), saved.getAssignedStaffEmail(), saved.getAssignedStaffName()));
        return supportTicketService.map(saved);
    }

    @Transactional
    public SupportTicketResponse rejectLiveSupport(String ticketCode, String staffEmail) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.isLiveRequested() || ticket.isLiveConnected()) {
            throw new IllegalArgumentException("Yêu cầu này không còn ở trạng thái chờ nhận.");
        }
        String staffName = userRepository.findByEmailIgnoreCase(staffEmail).map(u -> u.getFullName()).orElse(staffEmail);
        supportTicketService.saveMessage(ticket.getUuid(), "SYSTEM", "NASA BOT", staffName + " đã từ chối yêu cầu hỗ trợ này.");
        eventPublisher.publishEvent(new SupportLiveEvent("LIVE_REJECTED", ticket.getTicketCode(), staffEmail, staffName));
        return supportTicketService.getByCode(ticketCode);
    }

    @Transactional
    public SupportTicketResponse rateSatisfaction(String ticketCode, String ownerEmail, int rating) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền đánh giá ticket này.");
        }
        ticket.setSatisfactionRating(rating);
        ticket.setSatisfactionLabel(resolveSatisfactionLabel(rating));
        ticket.setStatus("DONE");
        ticket.setLiveConnected(false);
        SupportTicket saved = supportTicketRepository.save(ticket);
        supportTicketService.saveMessage(saved.getUuid(), "USER", saved.getOwnerName(), "Đánh giá hỗ trợ: " + saved.getSatisfactionLabel());
        eventPublisher.publishEvent(new SupportLiveEvent("SATISFACTION_SUBMITTED", saved.getTicketCode(), saved.getAssignedStaffEmail(), saved.getAssignedStaffName()));
        return supportTicketService.map(saved);
    }

    @Transactional
    public void deleteTicket(String ticketCode) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (ticket.getSatisfactionRating() == null && !"DONE".equalsIgnoreCase(ticket.getStatus())) {
            throw new IllegalArgumentException("Chỉ được xóa ticket đã hoàn tất hỗ trợ.");
        }
        supportTicketRepository.delete(ticket);
        eventPublisher.publishEvent(new SupportLiveEvent("TICKET_DELETED", ticketCode, ticket.getAssignedStaffEmail(), ticket.getAssignedStaffName()));
    }

    public void publishPresenceChanged(String eventType, String agentEmail, String agentName) {
        eventPublisher.publishEvent(new SupportLiveEvent(eventType, null, agentEmail, agentName));
    }

    private String resolveSatisfactionLabel(int rating) {
        return switch (rating) {
            case 5 -> "Rất hài lòng";
            case 4 -> "Hài lòng";
            case 3 -> "Bình thường";
            case 2 -> "Chưa hài lòng";
            default -> "Rất không hài lòng";
        };
    }

    public record SupportLiveEvent(String eventType, String ticketCode, String agentEmail, String agentName) {}

    public record SupportLiveAvailability(boolean anyOnline, List<SupportLiveAgent> agents) {}

    public record SupportLiveAgent(String email, String displayName) {}
}
