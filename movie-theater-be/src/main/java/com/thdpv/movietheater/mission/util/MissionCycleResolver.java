package com.thdpv.movietheater.mission.util;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.IsoFields;

import com.thdpv.movietheater.mission.enums.MissionRecurrence;

public final class MissionCycleResolver {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private MissionCycleResolver() {
    }

    public static String resolve(MissionRecurrence recurrence, OffsetDateTime at) {
        MissionRecurrence safe = recurrence != null ? recurrence : MissionRecurrence.ONCE;
        OffsetDateTime when = at != null ? at : OffsetDateTime.now();
        var date = when.atZoneSameInstant(VIETNAM_ZONE).toLocalDate();
        return switch (safe) {
            case ONCE -> "ONCE";
            case WEEKLY -> String.format(
                    "%d-W%02d",
                    date.get(IsoFields.WEEK_BASED_YEAR),
                    date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
            case MONTHLY -> String.format("%d-%02d", date.getYear(), date.getMonthValue());
        };
    }
}
