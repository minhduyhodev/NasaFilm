package com.thdpv.movietheater.discover.support;

import java.util.List;
import java.util.Set;

import com.thdpv.movietheater.discover.dto.response.DiscoverConfigResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverQuizOptionResponse;

public final class DiscoverQuizConfig {

    public static final int MAX_MATCHES = 3;
    public static final int MAX_GENRE_SELECTIONS = 2;
    public static final int AUTHENTICATED_QUESTION_COUNT = 5;
    public static final int GUEST_QUESTION_COUNT = 4;

    public static final Set<String> MOODS = Set.of("RELAX", "EXCITING", "EMOTIONAL", "THRILLING");
    public static final Set<String> DURATIONS = Set.of("SHORT", "MEDIUM", "LONG");
    public static final Set<String> VIEWING_LOCATIONS = Set.of("THEATER", "HOME", "BOTH");

    private DiscoverQuizConfig() {
    }

    public static DiscoverConfigResponse toResponse() {
        DiscoverConfigResponse response = new DiscoverConfigResponse();
        response.setMaxMatches(MAX_MATCHES);
        response.setMaxGenreSelections(MAX_GENRE_SELECTIONS);
        response.setAuthenticatedQuestionCount(AUTHENTICATED_QUESTION_COUNT);
        response.setGuestQuestionCount(GUEST_QUESTION_COUNT);
        response.setMoods(List.copyOf(MOODS));
        response.setDurations(List.copyOf(DURATIONS));
        response.setViewingLocations(List.copyOf(VIEWING_LOCATIONS));
        response.setMoodOptions(fallbackOptions("MOOD", MOODS));
        response.setDurationOptions(fallbackOptions("DURATION", DURATIONS));
        response.setViewingOptions(fallbackOptions("VIEWING", VIEWING_LOCATIONS));
        return response;
    }

    private static List<DiscoverQuizOptionResponse> fallbackOptions(String group, Set<String> keys) {
        int order = 1;
        java.util.ArrayList<DiscoverQuizOptionResponse> options = new java.util.ArrayList<>();
        for (String key : keys) {
            DiscoverQuizOptionResponse option = new DiscoverQuizOptionResponse();
            option.setOptionGroup(group);
            option.setKey(key);
            option.setLabel(key);
            option.setSortOrder(order++);
            option.setActive(true);
            options.add(option);
        }
        return options;
    }
}
