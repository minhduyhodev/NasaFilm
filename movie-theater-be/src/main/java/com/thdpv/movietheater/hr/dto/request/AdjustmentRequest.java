package com.thdpv.movietheater.hr.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.AdjustmentType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Thêm khoản thưởng / khấu trừ cho nhân viên trong một kỳ lương.
 */
public record AdjustmentRequest(
        @NotNull UUID payrollPeriodUuid,
        @NotNull UUID userId,
        @NotNull AdjustmentType type,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal amount,
        @NotBlank String reason) {
}
