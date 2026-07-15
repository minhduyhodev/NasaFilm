package com.thdpv.movietheater.hr.dto.response;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record ShiftDefinitionResponse(
        UUID uuid,
        String code,
        String name,
        LocalTime startTime,
        LocalTime endTime,
        BigDecimal standardHours,
        boolean active,
        int sortOrder,
        List<String> requiredPermissions,
        boolean usingDefaultPermissions) {
}
