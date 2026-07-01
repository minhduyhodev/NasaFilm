package com.thdpv.movietheater.radar.support;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ShowtimeAvailabilityRow(
        UUID showtimeUuid,
        UUID movieUuid,
        UUID cinemaRoomUuid,
        OffsetDateTime startTime,
        int capacity,
        long bookedSeats,
        long lockedSeats) {

    public long availableSeats() {
        if (capacity <= 0) {
            return 0;
        }
        return Math.max(0, capacity - bookedSeats - lockedSeats);
    }

    public double occupancyRate() {
        if (capacity <= 0) {
            return 1.0;
        }
        return Math.min(1.0, (bookedSeats + lockedSeats) / (double) capacity);
    }
}
