package com.thdpv.movietheater.staff.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record StaffShowtimeSummaryResponse(
        UUID showtimeUuid,
        UUID movieUuid,
        String movieTitle,
        String posterUrl,
        String cinemaName,
        String roomName,
        OffsetDateTime startTime,
        int capacity,
        int soldSeats,
        int lockedSeats,
        int availableSeats,
        double occupancyPercent,
        boolean almostFull) {
}
