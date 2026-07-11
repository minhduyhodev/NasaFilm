package com.thdpv.movietheater.common.time;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Business calendar timezone for showtimes / movie day filters (Vietnam).
 */
public final class AppTimeZones {

    public static final ZoneId BUSINESS = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final ZoneOffset BUSINESS_OFFSET = ZoneOffset.ofHours(7);

    private AppTimeZones() {
    }

    public static OffsetDateTime dayStart(LocalDate date) {
        return date.atStartOfDay(BUSINESS).toOffsetDateTime();
    }

    public static OffsetDateTime now() {
        return OffsetDateTime.now(BUSINESS);
    }
}
