package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdjustmentResponse(
        UUID uuid,
        UUID payrollPeriodUuid,
        UUID userId,
        String type,
        BigDecimal amount,
        String reason,
        OffsetDateTime createdAt) {
}
