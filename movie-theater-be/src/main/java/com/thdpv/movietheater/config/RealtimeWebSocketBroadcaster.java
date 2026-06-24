package com.thdpv.movietheater.config;

import java.time.OffsetDateTime;
import java.util.Set;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.thdpv.movietheater.booking.dto.response.BookingActivityMessage;
import com.thdpv.movietheater.booking.event.BookingActivityEvent;

@Component
public class RealtimeWebSocketBroadcaster {

    private static final String TOPIC_ADMIN_DASHBOARD = "/topic/admin/dashboard";
    private static final String TOPIC_ADMIN_BOOKINGS = "/topic/admin/bookings";
    private static final String TOPIC_STAFF_CHECK_IN = "/topic/staff/check-in";

    private static final Set<String> STAFF_EVENTS = Set.of(
            "BOOKING_CONFIRMED",
            "TICKET_CHECKED_IN");

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeWebSocketBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookingActivity(BookingActivityEvent event) {
        BookingActivityMessage message = new BookingActivityMessage(
                event.eventType(),
                event.bookingUuid(),
                event.showtimeUuid(),
                event.ticketCode(),
                OffsetDateTime.now());

        messagingTemplate.convertAndSend(TOPIC_ADMIN_DASHBOARD, message);
        messagingTemplate.convertAndSend(TOPIC_ADMIN_BOOKINGS, message);

        if (STAFF_EVENTS.contains(event.eventType())) {
            messagingTemplate.convertAndSend(TOPIC_STAFF_CHECK_IN, message);
        }
    }
}
