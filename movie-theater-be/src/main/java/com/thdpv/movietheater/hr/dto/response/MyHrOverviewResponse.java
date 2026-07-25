package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;

/**
 * Tổng quan chấm công / lương của nhân viên trong tháng hiện tại.
 */
public record MyHrOverviewResponse(
        int upcomingShiftCount,
        int monthShiftCount,
        int monthRegularMinutes,
        int monthOtMinutes,
        int monthApprovedCount,
        int monthPendingCount,
        BigDecimal latestNetPay,
        String latestPayslipLabel,
        ShiftAssignmentResponse activeShift) {
}
