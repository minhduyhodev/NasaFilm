package com.thdpv.movietheater.hr.dto.request;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record ShiftAssignmentCreateRequest(
        @NotNull UUID userId,
        @NotNull UUID shiftDefinitionUuid,
        @NotNull LocalDate workDate,
        String note) {
}
