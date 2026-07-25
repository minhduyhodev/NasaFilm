package com.thdpv.movietheater.support.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class SupportRealtimeBroadcaster {

    private static final String ADMIN_TOPIC = "/topic/admin/support";
    private static final String ADMIN_LIVE_TOPIC = "/topic/admin/support-live";
    private static final String STAFF_AGENT_TOPIC = "/topic/staff/support-agents";
    private static final String USER_TOPIC_PREFIX = "/topic/support/";

    private final SimpMessagingTemplate messagingTemplate;

    public SupportRealtimeBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onSupportTicketEvent(SupportTicketService.SupportTicketEvent event) {
        if (event.ticketCode() == null || event.ticketCode().isBlank()) {
            return;
        }
        messagingTemplate.convertAndSend(ADMIN_TOPIC, event);
        messagingTemplate.convertAndSend(USER_TOPIC_PREFIX + event.ticketCode(), event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onSupportTicketDeletedEvent(SupportTicketService.SupportTicketDeletedEvent event) {
        messagingTemplate.convertAndSend(ADMIN_TOPIC, event);
        if (event.ticketCode() != null && !event.ticketCode().isBlank()) {
            messagingTemplate.convertAndSend(USER_TOPIC_PREFIX + event.ticketCode(), event);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onSupportLiveEvent(SupportLiveSupportService.SupportLiveEvent event) {
        messagingTemplate.convertAndSend(ADMIN_LIVE_TOPIC, event);
        messagingTemplate.convertAndSend(STAFF_AGENT_TOPIC, event);
        if (event.ticketCode() != null && !event.ticketCode().isBlank()) {
          messagingTemplate.convertAndSend(USER_TOPIC_PREFIX + event.ticketCode(), event);
        }
    }
}
