package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ComboRevenueResponse(
        BigDecimal totalRevenueThisMonth,
        BigDecimal totalRevenueLastMonth,
        Double growth,
        Long totalOrdersThisMonth,
        Long totalItemsSoldThisMonth,
        List<ComboRevenueItem> byCombo,
        List<DailyRevenueItem> dailyRevenue
) {
    public record ComboRevenueItem(
            String comboUuid,
            String comboName,
            Long quantitySold,
            BigDecimal revenue
    ) {}

    public record DailyRevenueItem(
            String date,
            BigDecimal revenue,
            Long orderCount
    ) {}
}
