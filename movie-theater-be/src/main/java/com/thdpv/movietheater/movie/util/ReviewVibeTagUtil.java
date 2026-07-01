package com.thdpv.movietheater.movie.util;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private static final int MAX_TAGS_PER_REVIEW = 3;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ReviewVibeTagUtil() {
    }

    public static List<String> normalizeAndValidate(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) {
            return List.of();
        }

        Set<String> unique = new LinkedHashSet<>();
        for (String raw : rawTags) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String code = raw.trim().toLowerCase();
            if (ReviewVibeTag.fromCode(code).isEmpty()) {
                throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag khong hop le: " + raw);
            }
            unique.add(code);
        }

        if (unique.size() > MAX_TAGS_PER_REVIEW) {
            throw new AppException(
                    ErrorCode.REVIEW_INVALID_VIBE_TAGS,
                    "Chi duoc chon toi da " + MAX_TAGS_PER_REVIEW + " vibe tag");
        }

        return List.copyOf(unique);
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

    public static boolean isBestOnBigScreen(long totalReviews, Map<String, Long> vibeTagCounts) {
        if (totalReviews <= 0 || vibeTagCounts == null) {
            return false;
        }
        long theaterTagCount = vibeTagCounts.getOrDefault(BEST_ON_BIG_SCREEN_TAG, 0L);
        return theaterTagCount > 0 && ((double) theaterTagCount / totalReviews) >= BEST_ON_BIG_SCREEN_THRESHOLD;
    }

    public static String validateFilterTag(String vibeTag) {
        if (vibeTag == null || vibeTag.isBlank()) {
            return null;
        }
        String code = vibeTag.trim().toLowerCase();
        if (ReviewVibeTag.fromCode(code).isEmpty()) {
            throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag loc khong hop le");
        }
        return code;
    }
}
