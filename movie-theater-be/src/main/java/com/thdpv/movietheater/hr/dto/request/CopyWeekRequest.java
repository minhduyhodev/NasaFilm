package com.thdpv.movietheater.hr.dto.request;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.NotNull;

/**
 * Nhân bản lịch từ tuần nguồn sang tuần đích (mỗi tham số là ngày đầu tuần).
 */
public record CopyWeekRequest(
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sourceWeekStart,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetWeekStart) {
}
