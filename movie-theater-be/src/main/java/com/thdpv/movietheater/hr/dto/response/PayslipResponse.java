package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record PayslipResponse(
        UUID uuid,
        UUID payrollPeriodUuid,
        String periodLabel,
        int periodYear,
        int periodMonth,
        UUID userId,
        String fullName,
        String email,
        int regularMinutes,
        int otMinutes,
        BigDecimal hourlyRate,
        BigDecimal regularPay,
        BigDecimal otPay,
        BigDecimal bonusTotal,
        BigDecimal deductionTotal,
        BigDecimal grossPay,
        BigDecimal netPay,
        String status,
        String note,
        OffsetDateTime approvedAt,
        OffsetDateTime paidAt,
        List<AdjustmentResponse> adjustments) {
}
