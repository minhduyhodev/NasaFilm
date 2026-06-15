package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record AdminDashboardResponse(
    BigDecimal totalRevenue,
    Long totalTransactions,
    Double growth,
    Double conversionRate,
    List<CinemaStat> cinemas,
    List<GenreStat> genres
) {
    public record CinemaStat(
        String name,
        BigDecimal revenue,
        Double occupancyRate
    ) {}

    public record GenreStat(
        String name,
        Double occupancyRate
    ) {}
}
