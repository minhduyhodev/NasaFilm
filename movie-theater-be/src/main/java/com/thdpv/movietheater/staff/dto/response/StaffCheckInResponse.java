package com.thdpv.movietheater.staff.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record StaffCheckInResponse(
        UUID bookingUuid,
        UUID showtimeUuid,
        String ticketCode,
        String customerName,
        String movieTitle,
        String cinemaName,
        String roomName,
        String showtimeDisplay,
        OffsetDateTime showtimeStart,
        List<String> seatLabels,
        String status,
        OffsetDateTime checkedInAt,
        boolean alreadyCheckedIn) {
}
