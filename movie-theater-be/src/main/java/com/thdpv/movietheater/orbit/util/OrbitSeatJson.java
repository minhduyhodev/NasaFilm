package com.thdpv.movietheater.orbit.util;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class OrbitSeatJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<UUID>> UUID_LIST = new TypeReference<>() {};

    private OrbitSeatJson() {
    }

    public static String writeSeatUuids(List<UUID> seatUuids) {
        try {
            return MAPPER.writeValueAsString(seatUuids != null ? seatUuids : List.of());
        } catch (Exception ex) {
            return "[]";
        }
    }

    public static List<UUID> readSeatUuids(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<UUID> parsed = MAPPER.readValue(json, UUID_LIST);
            return parsed != null ? parsed : List.of();
        } catch (Exception ex) {
            return List.of();
        }
    }

    public static List<UUID> normalizeSeatUuids(List<UUID> seatUuids) {
        if (seatUuids == null || seatUuids.isEmpty()) {
            return List.of();
        }
        List<UUID> normalized = new ArrayList<>();
        for (UUID seatUuid : seatUuids) {
            if (seatUuid != null && !normalized.contains(seatUuid)) {
                normalized.add(seatUuid);
            }
        }
        return normalized;
    }
}
