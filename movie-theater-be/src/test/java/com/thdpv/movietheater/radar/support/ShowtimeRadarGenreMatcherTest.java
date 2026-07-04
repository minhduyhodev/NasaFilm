package com.thdpv.movietheater.radar.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class ShowtimeRadarGenreMatcherTest {

    private static final UUID PHI_EU_LUU = UUID.fromString("9fd34501-9a34-44cb-b556-784482079684");
    private static final UUID PHI_EU_LUU_VIEN_TUONG = UUID.fromString("37ef5f49-ea09-469b-af50-91487725b818");
    private static final UUID KHOA_HOC_VIEN_TUONG = UUID.randomUUID();
    private static final UUID HANH_DONG = UUID.randomUUID();

    @Test
    void matchesExactGenreUuid() {
        Map<UUID, String> names = Map.of(
                PHI_EU_LUU, "Phiêu lưu",
                HANH_DONG, "Hành động");
        assertTrue(ShowtimeRadarGenreMatcher.matches(
                List.of(PHI_EU_LUU),
                Set.of(PHI_EU_LUU, HANH_DONG),
                names));
    }

    @Test
    void matchesCompoundGenreBySemanticTokens() {
        Map<UUID, String> names = Map.of(
                PHI_EU_LUU_VIEN_TUONG, "Phiêu lưu viễn tưởng",
                KHOA_HOC_VIEN_TUONG, "Khoa học viễn tưởng",
                PHI_EU_LUU, "Phiêu lưu",
                HANH_DONG, "Hành động");

        assertTrue(ShowtimeRadarGenreMatcher.matches(
                List.of(PHI_EU_LUU_VIEN_TUONG),
                Set.of(KHOA_HOC_VIEN_TUONG, PHI_EU_LUU, HANH_DONG),
                names));
    }

    @Test
    void rejectsUnrelatedGenreSelection() {
        Map<UUID, String> names = Map.of(
                PHI_EU_LUU_VIEN_TUONG, "Phiêu lưu viễn tưởng",
                HANH_DONG, "Hành động");

        assertFalse(ShowtimeRadarGenreMatcher.matches(
                List.of(PHI_EU_LUU_VIEN_TUONG),
                Set.of(HANH_DONG),
                names));
    }
}
