package com.thdpv.movietheater.hr.dto.request;

import java.time.OffsetDateTime;

import jakarta.validation.constraints.PositiveOrZero;

/**
 * Admin chỉnh sửa bản ghi chấm công (giờ vào/ra, số phút OT được duyệt, ghi chú).
 */
public record AttendanceUpdateRequest(
        OffsetDateTime checkInAt,
        OffsetDateTime checkOutAt,
        @PositiveOrZero Integer otMinutesApproved,
        String note) {
}
