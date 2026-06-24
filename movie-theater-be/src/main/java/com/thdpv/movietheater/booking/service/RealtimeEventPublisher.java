package com.thdpv.movietheater.booking.service;

import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.booking.event.BookingActivityEvent;

@Service
public class RealtimeEventPublisher {

    private final ApplicationEventPublisher eventPublisher;

    public RealtimeEventPublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void notifyBookingConfirmed(UUID bookingUuid, UUID showtimeUuid) {
        publish("BOOKING_CONFIRMED", bookingUuid, showtimeUuid, null);
    }

    public void notifyOnlineBookingConfirmed(UUID bookingUuid) {
        publish("ONLINE_BOOKING_CONFIRMED", bookingUuid, null, null);
    }

    public void notifyBookingCancelled(UUID bookingUuid, UUID showtimeUuid) {
        publish("BOOKING_CANCELLED", bookingUuid, showtimeUuid, null);
    }

    public void notifyTicketCheckedIn(UUID bookingUuid, UUID showtimeUuid, String ticketCode) {
        publish("TICKET_CHECKED_IN", bookingUuid, showtimeUuid, ticketCode);
    }

    private void publish(String eventType, UUID bookingUuid, UUID showtimeUuid, String ticketCode) {
        if (bookingUuid == null) {
            return;
        }
        eventPublisher.publishEvent(new BookingActivityEvent(eventType, bookingUuid, showtimeUuid, ticketCode));
    }
}
