package com.thdpv.movietheater.orbit.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.thdpv.movietheater.orbit.event.OrbitRoomUpdatedEvent;

@Component
public class OrbitRoomBroadcaster {

    private static final String TOPIC_PREFIX = "/topic/orbit/";

    private final SimpMessagingTemplate messagingTemplate;
    private final ApplicationEventPublisher eventPublisher;

    public OrbitRoomBroadcaster(
            SimpMessagingTemplate messagingTemplate,
            ApplicationEventPublisher eventPublisher) {
        this.messagingTemplate = messagingTemplate;
        this.eventPublisher = eventPublisher;
    }

    public void notifyRoomUpdated(UUID roomUuid) {
        eventPublisher.publishEvent(new OrbitRoomUpdatedEvent(roomUuid, "ORBIT_ROOM_UPDATED"));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRoomUpdated(OrbitRoomUpdatedEvent event) {
        messagingTemplate.convertAndSend(
                TOPIC_PREFIX + event.roomUuid(),
                new OrbitRoomWsPayload(event.roomUuid(), event.eventType(), OffsetDateTime.now()));
    }

    public record OrbitRoomWsPayload(UUID roomUuid, String eventType, OffsetDateTime at) {
    }
}
