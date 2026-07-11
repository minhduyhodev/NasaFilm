package com.thdpv.movietheater.user.dto;

public record AdminUserStatsResponse(
        long total,
        long active,
        long suspended,
        long pending,
        long inactive,
        long vip) {
}
