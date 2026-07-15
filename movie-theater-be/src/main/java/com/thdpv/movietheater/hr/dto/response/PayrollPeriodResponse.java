package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PayrollPeriodResponse(
        UUID uuid,
        int periodYear,
        int periodMonth,
        String label,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        int payslipCount,
        BigDecimal totalNetPay,
        boolean stale,
        int warningCount,
        int pendingAttendanceCount,
        OffsetDateTime generatedAt,
        OffsetDateTime approvedAt,
        OffsetDateTime paidAt,
        OffsetDateTime createdAt) {
}
