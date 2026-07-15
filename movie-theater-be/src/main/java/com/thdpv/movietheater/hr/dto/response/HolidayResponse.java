package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record HolidayResponse(
        UUID uuid,
        LocalDate holidayDate,
        String name,
        BigDecimal multiplierOverride) {
}
