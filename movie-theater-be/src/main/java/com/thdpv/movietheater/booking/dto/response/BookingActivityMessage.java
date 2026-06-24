package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BookingActivityMessage(
        String eventType,
        UUID bookingUuid,
        UUID showtimeUuid,
        String ticketCode,
        OffsetDateTime timestamp) {
}
