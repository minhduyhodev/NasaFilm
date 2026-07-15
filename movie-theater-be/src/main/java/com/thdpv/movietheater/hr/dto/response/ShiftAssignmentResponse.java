package com.thdpv.movietheater.hr.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ShiftAssignmentResponse(
        UUID uuid,
        UUID userId,
        String fullName,
        String email,
        UUID shiftDefinitionUuid,
        String shiftCode,
        String shiftName,
        LocalTime startTime,
        LocalTime endTime,
        LocalDate workDate,
        String status,
        String note,
        UUID attendanceUuid,
        String attendanceStatus,
        String approvalStatus,
        OffsetDateTime checkInAt,
        OffsetDateTime checkOutAt) {
}
