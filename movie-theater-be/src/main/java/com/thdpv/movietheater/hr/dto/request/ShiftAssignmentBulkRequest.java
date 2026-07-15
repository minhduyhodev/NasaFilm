package com.thdpv.movietheater.hr.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;

/**
 * Xếp ca hàng loạt: tích Descartes giữa nhân viên × ca × ngày.
 */
public record ShiftAssignmentBulkRequest(
        @NotEmpty List<UUID> userIds,
        @NotEmpty List<UUID> shiftDefinitionUuids,
        @NotEmpty List<LocalDate> workDates,
        String note) {
}
