package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SeatMapUpdateEvent(
        UUID showtimeUuid,
        String eventType,
        OffsetDateTime timestamp) {
}
