package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record AdminDashboardResponse(
    BigDecimal totalRevenue,
    Long totalTransactions,
    Double growth,
    Double conversionRate,
    List<CinemaStat> cinemas,
    List<GenreStat> genres,
    List<MovieStat> topMovies
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

    public record MovieStat(
        UUID uuid,
        String title,
        BigDecimal revenue,
        Long bookingCount,
        String primaryMediaUrl
    ) {}
}
