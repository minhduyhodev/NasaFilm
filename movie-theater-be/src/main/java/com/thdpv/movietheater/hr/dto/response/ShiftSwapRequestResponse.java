package com.thdpv.movietheater.hr.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ShiftSwapRequestResponse(
        UUID uuid,
        String status,
        String note,
        String reviewNote,
        OffsetDateTime reviewedAt,
        OffsetDateTime createdAt,
        Party requester,
        Party counterpart) {

    /** Một phía của giao dịch đổi ca: nhân viên + ca mà họ đang giữ. */
    public record Party(
            UUID userUuid,
            String fullName,
            String email,
            UUID assignmentUuid,
            String shiftName,
            LocalDate workDate,
            LocalTime startTime,
            LocalTime endTime) {
    }
}
