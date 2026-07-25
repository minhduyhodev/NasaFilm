package com.thdpv.movietheater.hr.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AttendanceResponse(
        UUID uuid,
        UUID shiftAssignmentUuid,
        UUID userId,
        String fullName,
        String email,
        UUID shiftDefinitionUuid,
        String shiftCode,
        String shiftName,
        LocalDate workDate,
        LocalTime shiftStart,
        LocalTime shiftEnd,
        OffsetDateTime checkInAt,
        OffsetDateTime checkOutAt,
        int workedMinutes,
        int regularMinutes,
        int otMinutes,
        int otMinutesApproved,
        int lateMinutes,
        int earlyLeaveMinutes,
        String attendanceStatus,
        String dayType,
        String approvalStatus,
        OffsetDateTime approvedAt,
        String note) {
}
