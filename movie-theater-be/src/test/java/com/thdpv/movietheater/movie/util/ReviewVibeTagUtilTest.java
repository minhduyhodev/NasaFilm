package com.thdpv.movietheater.movie.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

class ReviewVibeTagUtilTest {

    @Test
    void normalizeAndValidate_deduplicatesBeforeLimitCheck() {
        List<String> result = ReviewVibeTagUtil.normalizeAndValidate(
                List.of("cam_dong", "cam_dong", "plot_twist", "so"));
        assertEquals(List.of("cam_dong", "plot_twist", "so"), result);
    }

    @Test
    void normalizeAndValidate_rejectsMoreThanThreeUniqueTags() {
        AppException ex = assertThrows(AppException.class, () -> ReviewVibeTagUtil.normalizeAndValidate(
                List.of("cam_dong", "plot_twist", "so", "hai_long")));
        assertEquals(ErrorCode.REVIEW_INVALID_VIBE_TAGS, ex.getErrorCode());
    }

    @Test
    void normalizeAndValidate_rejectsUnknownTag() {
        AppException ex = assertThrows(AppException.class, () -> ReviewVibeTagUtil.normalizeAndValidate(
                List.of("unknown_tag")));
        assertEquals(ErrorCode.REVIEW_INVALID_VIBE_TAGS, ex.getErrorCode());
    }

    @Test
    void fromJson_returnsEmptyListForInvalidJson() {
        assertTrue(ReviewVibeTagUtil.fromJson("{not-json").isEmpty());
    }

    @Test
    void aggregateTagCounts_sortsByPopularityDescending() {
        Map<String, Long> counts = ReviewVibeTagUtil.aggregateTagCounts(List.of(
                "[\"cam_dong\",\"so\"]",
                "[\"cam_dong\"]",
                "[\"plot_twist\"]"));

        assertEquals(2L, counts.get("cam_dong"));
        assertEquals(1L, counts.get("so"));
        assertEquals(1L, counts.get("plot_twist"));

        List<String> order = List.copyOf(counts.keySet());
        assertEquals("cam_dong", order.get(0));
    }

    @Test
    void isBestOnBigScreen_requiresFortyPercentOfTotalReviews() {
        Map<String, Long> counts = Map.of(ReviewVibeTagUtil.BEST_ON_BIG_SCREEN_TAG, 2L);
        assertTrue(ReviewVibeTagUtil.isBestOnBigScreen(5, counts));
        assertFalse(ReviewVibeTagUtil.isBestOnBigScreen(6, counts));
    }

    @Test
    void toJson_andFromJson_roundTrip() {
        List<String> tags = List.of("cam_dong", "so");
        String json = ReviewVibeTagUtil.toJson(tags);
        assertEquals(tags, ReviewVibeTagUtil.fromJson(json));
    }

    @Test
    void validateFilterTag_normalizesCode() {
        assertEquals("cam_dong", ReviewVibeTagUtil.validateFilterTag("CAM_DONG"));
    }
}
