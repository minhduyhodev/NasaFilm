package com.thdpv.movietheater.mission.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.mission.enums.MissionRecurrence;

class MissionCycleResolverTest {

    @Test
    void resolve_once_returnsOnceKey() {
        OffsetDateTime at = OffsetDateTime.parse("2026-07-01T12:00:00+07:00");
        assertEquals("ONCE", MissionCycleResolver.resolve(MissionRecurrence.ONCE, at));
    }

    @Test
    void resolve_weekly_usesVietnamWeek() {
        OffsetDateTime at = OffsetDateTime.parse("2026-07-01T12:00:00+07:00");
        assertEquals("2026-W27", MissionCycleResolver.resolve(MissionRecurrence.WEEKLY, at));
    }

    @Test
    void resolve_monthly_usesVietnamMonth() {
        OffsetDateTime at = OffsetDateTime.parse("2026-07-15T08:00:00+07:00");
        assertEquals("2026-07", MissionCycleResolver.resolve(MissionRecurrence.MONTHLY, at));
    }

    @Test
    void resolve_nullRecurrence_defaultsToOnce() {
        assertEquals("ONCE", MissionCycleResolver.resolve(null, null));
    }
}
