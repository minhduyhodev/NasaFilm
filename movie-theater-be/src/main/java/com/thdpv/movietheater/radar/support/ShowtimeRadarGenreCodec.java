package com.thdpv.movietheater.radar.support;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public final class ShowtimeRadarGenreCodec {

    private ShowtimeRadarGenreCodec() {
    }

    public static List<UUID> decode(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(UUID::fromString)
                .toList();
    }

    public static String encode(List<UUID> genreUuids) {
        if (genreUuids == null || genreUuids.isEmpty()) {
            return "";
        }
        return genreUuids.stream()
                .map(UUID::toString)
                .collect(Collectors.joining(","));
    }

    public static boolean matchesTimeSlot(OffsetDateTime startTime, Integer startHour, Integer endHour) {
        if (startHour == null && endHour == null) {
            return true;
        }
        int hour = startTime.getHour();
        if (startHour != null && endHour == null) {
            return hour >= startHour;
        }
        if (startHour == null && endHour != null) {
            return hour < endHour;
        }
        if (startHour <= endHour) {
            return hour >= startHour && hour < endHour;
        }
        return hour >= startHour || hour < endHour;
    }
}
