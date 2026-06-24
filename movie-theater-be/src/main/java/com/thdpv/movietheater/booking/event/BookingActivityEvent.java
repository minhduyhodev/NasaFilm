package com.thdpv.movietheater.booking.event;

import java.util.UUID;

public record BookingActivityEvent(
        String eventType,
        UUID bookingUuid,
        UUID showtimeUuid,
        String ticketCode) {
}
