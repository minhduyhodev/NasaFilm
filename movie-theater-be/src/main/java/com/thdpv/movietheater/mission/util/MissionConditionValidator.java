package com.thdpv.movietheater.mission.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.mission.enums.MissionConditionType;

public final class MissionConditionValidator {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final int MIN_WINDOW_DAYS = 1;
    private static final int MAX_WINDOW_DAYS = 365;

    private MissionConditionValidator() {
    }

    public static void validate(MissionConditionType conditionType, String conditionJson) {
        if (conditionType == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Loại điều kiện nhiệm vụ không hợp lệ.");
        }
        String safeJson = conditionJson == null || conditionJson.isBlank() ? "{}" : conditionJson.trim();
        switch (conditionType) {
            case GENRE_WINDOW, PREMIERE_BOOKING -> validateWindowDays(safeJson, conditionType);
            case HYBRID_THEATER_VOD, REVIEW_WITH_VIBE_TAG, ORBIT_ROOM_JOIN, MATCHMAKER_QUIZ -> validateJsonObject(safeJson);
            default -> validateJsonObject(safeJson);
        }
    }

    private static void validateWindowDays(String conditionJson, MissionConditionType conditionType) {
        JsonNode node = parseJsonObject(conditionJson);
        if (!node.has("windowDays")) {
            return;
        }
        JsonNode windowDays = node.get("windowDays");
        if (!windowDays.canConvertToInt()) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "windowDays phải là số nguyên dương (1–365).");
        }
        int days = windowDays.asInt();
        if (days < MIN_WINDOW_DAYS || days > MAX_WINDOW_DAYS) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "windowDays cho "
                            + conditionType.name()
                            + " phải từ "
                            + MIN_WINDOW_DAYS
                            + " đến "
                            + MAX_WINDOW_DAYS
                            + ".");
        }
    }

    private static void validateJsonObject(String conditionJson) {
        parseJsonObject(conditionJson);
    }

    private static JsonNode parseJsonObject(String conditionJson) {
        try {
            JsonNode node = OBJECT_MAPPER.readTree(conditionJson);
            if (node == null || !node.isObject()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "conditionJson phải là object JSON hợp lệ.");
            }
            return node;
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AppException(ErrorCode.BAD_REQUEST, "conditionJson không phải JSON hợp lệ.");
        }
    }
}
