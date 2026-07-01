package com.thdpv.movietheater.movie.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class ReviewVibeTagUtilTest {

    @Test
    void fromJson_returnsEmptyListForInvalidJson() {
        assertTrue(ReviewVibeTagUtil.fromJson("{not-json").isEmpty());
    }

    @Test
    void toSortedTagCountMap_preservesQueryOrder() {
        Map<String, Long> counts = ReviewVibeTagUtil.toSortedTagCountMap(List.of(
                new Object[] { "cam_dong", 2L },
                new Object[] { "so", 1L }));

        assertEquals(2L, counts.get("cam_dong"));
        assertEquals(1L, counts.get("so"));
        assertEquals("cam_dong", List.copyOf(counts.keySet()).get(0));
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
    void isBestOnBigScreen_usesTaggedReviewDenominator() {
        Map<String, Long> counts = Map.of(ReviewVibeTagUtil.BEST_ON_BIG_SCREEN_TAG, 2L);
        assertTrue(ReviewVibeTagUtil.isBestOnBigScreen(4, counts));
        assertFalse(ReviewVibeTagUtil.isBestOnBigScreen(6, counts));
        assertFalse(ReviewVibeTagUtil.isBestOnBigScreen(0, counts));
    }

    @Test
    void toJson_andFromJson_roundTrip() {
        List<String> tags = List.of("cam_dong", "so");
        String json = ReviewVibeTagUtil.toJson(tags);
        assertEquals(tags, ReviewVibeTagUtil.fromJson(json));
    }
}
