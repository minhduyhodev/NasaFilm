package com.thdpv.movietheater.mission.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.mission.enums.MissionConditionType;

class MissionConditionValidatorTest {

    @Test
    void validate_acceptsGenreWindowWithValidDays() {
        assertDoesNotThrow(() -> MissionConditionValidator.validate(
                MissionConditionType.GENRE_WINDOW, "{\"windowDays\":30}"));
    }

    @Test
    void validate_rejectsInvalidWindowDays() {
        assertThrows(AppException.class, () -> MissionConditionValidator.validate(
                MissionConditionType.PREMIERE_BOOKING, "{\"windowDays\":0}"));
    }

    @Test
    void validate_rejectsMalformedJson() {
        assertThrows(AppException.class, () -> MissionConditionValidator.validate(
                MissionConditionType.REVIEW_WITH_VIBE_TAG, "not-json"));
    }

    @Test
    void validate_acceptsEmptyObjectForHybrid() {
        assertDoesNotThrow(() -> MissionConditionValidator.validate(
                MissionConditionType.HYBRID_THEATER_VOD, "{}"));
    }
}
