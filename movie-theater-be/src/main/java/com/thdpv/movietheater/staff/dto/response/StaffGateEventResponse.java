package com.thdpv.movietheater.staff.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record StaffGateEventResponse(
        UUID eventUuid,
        UUID showtimeUuid,
        UUID bookingUuid,
        String ticketCode,
        String eventType,
        String staffEmail,
        String customerName,
        String movieTitle,
        String seatLabels,
        String errorMessage,
        String scanSource,
        OffsetDateTime createdAt) {
}
