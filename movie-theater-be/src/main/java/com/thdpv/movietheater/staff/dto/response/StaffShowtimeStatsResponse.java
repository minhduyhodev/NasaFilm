package com.thdpv.movietheater.staff.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record StaffShowtimeStatsResponse(
        UUID showtimeUuid,
        String movieTitle,
        String cinemaName,
        String roomName,
        OffsetDateTime startTime,
        int capacity,
        int soldSeats,
        int lockedSeats,
        int availableSeats,
        double occupancyPercent,
        boolean almostFull,
        int checkedInBookings,
        int vipTotal,
        int vipAvailable,
        List<StaffComboStatItem> topCombos) {
}
