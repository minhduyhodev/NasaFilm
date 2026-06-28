package com.thdpv.movietheater.booking.service;

import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.booking.event.SeatMapUpdatedEvent;

@Service
public class SeatMapEventPublisher {

    private final ApplicationEventPublisher eventPublisher;

    public SeatMapEventPublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void notifySeatMapUpdated(UUID showtimeUuid) {
        if (showtimeUuid == null) {
            return;
        }
        eventPublisher.publishEvent(new SeatMapUpdatedEvent(showtimeUuid));
    }
}
