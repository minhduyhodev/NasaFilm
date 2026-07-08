package com.thdpv.movietheater.orbit.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomMessageResponse;
import com.thdpv.movietheater.orbit.event.OrbitRoomUpdatedEvent;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;

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

    public void notifyRoomUpdated(OrbitRoomResponse room) {
        if (room == null || room.getUuid() == null) {
            return;
        }
        eventPublisher.publishEvent(new OrbitRoomUpdatedEvent(room));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRoomUpdated(OrbitRoomUpdatedEvent event) {
        OrbitRoomResponse room = event.room();
        messagingTemplate.convertAndSend(TOPIC_PREFIX + room.getUuid(), room);
    }

    public void broadcastChatMessage(UUID roomUuid, OrbitRoomMessageResponse message) {
        messagingTemplate.convertAndSend(TOPIC_PREFIX + roomUuid + "/chat", message);
    }
}
