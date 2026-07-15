package com.thdpv.movietheater.hr.dto.response;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LeaveRequestResponse(
        UUID uuid,
        UUID userUuid,
        String fullName,
        String email,
        String leaveType,
        LocalDate fromDate,
        LocalDate toDate,
        long days,
        String reason,
        String status,
        String reviewNote,
        OffsetDateTime reviewedAt,
        OffsetDateTime createdAt) {
}
