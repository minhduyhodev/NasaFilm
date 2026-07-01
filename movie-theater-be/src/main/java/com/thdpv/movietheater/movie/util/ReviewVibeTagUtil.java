package com.thdpv.movietheater.movie.util;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.enums.ReviewVibeTag;

public final class ReviewVibeTagUtil {

    public static final String BEST_ON_BIG_SCREEN_TAG = ReviewVibeTag.DANG_XEM_RAP.getCode();
    public static final double BEST_ON_BIG_SCREEN_THRESHOLD = 0.4;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ReviewVibeTagUtil() {
    }

    public static String toJsonArrayContainsQuery(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return "[\"" + code.trim().toLowerCase() + "\"]";
    }

    public static String toJson(List<String> tags) {
        List<String> safe = tags == null ? List.of() : tags;
        if (safe.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(safe);
        } catch (JsonProcessingException ex) {
            throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Khong the luu vibe tag");
        }
    }

    public static List<String> fromJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> parsed = MAPPER.readValue(json, new TypeReference<List<String>>() {});
            return parsed == null ? List.of() : parsed;
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    public static Map<String, Long> aggregateTagCounts(List<String> vibeTagsJsonRows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        if (vibeTagsJsonRows == null) {
            return counts;
        }
        for (String row : vibeTagsJsonRows) {
            for (String code : fromJson(row)) {
                counts.merge(code, 1L, Long::sum);
            }
        }
        return counts.entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new));
    }

    public static Map<String, Long> toSortedTagCountMap(List<Object[]> rows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        if (rows == null) {
            return counts;
        }
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) {
                continue;
            }
            counts.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return counts;
    }

    /**
     * @param taggedReviewCount reviews that have at least one vibe tag
     */
    public static boolean isBestOnBigScreen(long taggedReviewCount, Map<String, Long> vibeTagCounts) {
        if (taggedReviewCount <= 0 || vibeTagCounts == null) {
            return false;
        }
        long theaterTagCount = vibeTagCounts.getOrDefault(BEST_ON_BIG_SCREEN_TAG, 0L);
        return theaterTagCount > 0
                && ((double) theaterTagCount / taggedReviewCount) >= BEST_ON_BIG_SCREEN_THRESHOLD;
    }
}
