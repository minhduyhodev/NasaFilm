package com.thdpv.movietheater.config;

import java.time.OffsetDateTime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.thdpv.movietheater.booking.dto.response.SeatMapUpdateEvent;
import com.thdpv.movietheater.booking.event.SeatMapUpdatedEvent;

@Component
public class SeatMapWebSocketBroadcaster {

    private static final String TOPIC_PREFIX = "/topic/showtimes/";

    private final SimpMessagingTemplate messagingTemplate;

    public SeatMapWebSocketBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onSeatMapUpdated(SeatMapUpdatedEvent event) {
        messagingTemplate.convertAndSend(
                TOPIC_PREFIX + event.showtimeUuid() + "/seats",
                new SeatMapUpdateEvent(event.showtimeUuid(), "SEAT_MAP_UPDATED", OffsetDateTime.now()));
    }
}
