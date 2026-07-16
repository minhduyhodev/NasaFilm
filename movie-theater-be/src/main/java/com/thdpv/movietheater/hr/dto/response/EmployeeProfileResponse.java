package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EmployeeProfileResponse(
        UUID userId,
        String fullName,
        String email,
        String phoneNumber,
        String avatarUrl,
        List<String> roles,
        boolean hasProfile,
        BigDecimal hourlyRate,
        BigDecimal otMultiplierWeekday,
        BigDecimal otMultiplierWeekend,
        BigDecimal otMultiplierHoliday,
        String employmentType,
        boolean active,
        String note,
        OffsetDateTime updatedAt) {
}
