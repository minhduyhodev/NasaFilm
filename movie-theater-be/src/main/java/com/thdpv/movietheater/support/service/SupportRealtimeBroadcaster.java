package com.thdpv.movietheater.support.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class SupportRealtimeBroadcaster {

    private static final String ADMIN_TOPIC = "/topic/admin/support";
    private static final String USER_TOPIC_PREFIX = "/topic/support/";

    private final SimpMessagingTemplate messagingTemplate;

    public SupportRealtimeBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSupportTicketEvent(SupportTicketService.SupportTicketEvent event) {
        if (event.ticketCode() == null || event.ticketCode().isBlank()) {
            return;
        }
        messagingTemplate.convertAndSend(ADMIN_TOPIC, event);
        messagingTemplate.convertAndSend(USER_TOPIC_PREFIX + event.ticketCode(), event);
    }
}
