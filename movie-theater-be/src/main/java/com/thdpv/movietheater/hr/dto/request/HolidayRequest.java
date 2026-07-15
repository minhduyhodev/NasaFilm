package com.thdpv.movietheater.hr.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record HolidayRequest(
        @NotNull LocalDate holidayDate,
        @NotBlank String name,
        @DecimalMin(value = "1.0") BigDecimal multiplierOverride) {
}
