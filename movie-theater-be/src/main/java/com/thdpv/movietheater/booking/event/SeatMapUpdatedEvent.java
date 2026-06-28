package com.thdpv.movietheater.booking.event;

import java.util.UUID;

public record SeatMapUpdatedEvent(UUID showtimeUuid) {
}
