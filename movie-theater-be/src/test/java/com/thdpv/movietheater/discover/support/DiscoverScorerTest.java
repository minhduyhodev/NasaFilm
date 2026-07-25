package com.thdpv.movietheater.discover.support;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.discover.dto.request.DiscoverMatchRequest;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.enums.ScreeningMode;

class DiscoverScorerTest {

    private static final UUID ACTION_UUID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID COMEDY_UUID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void shouldScoreMoodGenreAndDuration() {
        Map<UUID, String> genres = Map.of(
                ACTION_UUID, "Hành động",
                COMEDY_UUID, "Hài");

        MovieListResponse movie = new MovieListResponse();
        movie.setTitle("Test Action");
        movie.setDurationMinutes(105);
        movie.setGenres(List.of("Hành động"));
        movie.setScreeningMode(ScreeningMode.BOTH.name());
        movie.setReviewAverageRating(4.5);

        DiscoverMatchRequest request = new DiscoverMatchRequest();
        request.setMood("EXCITING");
        request.setDuration("MEDIUM");
        request.setViewingLocation("BOTH");

        var result = DiscoverScorer.score(movie, request, genres, Set.of());

        assertTrue(result.score() >= 40);
        assertTrue(result.reasons().stream().anyMatch(reason -> reason.contains("kịch tính")));
        assertTrue(result.reasons().stream().anyMatch(reason -> reason.contains("Thời lượng")));
    }

    @Test
    void shouldScoreSelectedGenres() {
        Map<UUID, String> genres = Map.of(COMEDY_UUID, "Hài");

        MovieListResponse movie = new MovieListResponse();
        movie.setGenres(List.of("Hài"));
        movie.setDurationMinutes(90);
        movie.setScreeningMode(ScreeningMode.ONLINE_ONLY.name());

        DiscoverMatchRequest request = new DiscoverMatchRequest();
        request.setMood("RELAX");
        request.setDuration("SHORT");
        request.setViewingLocation("HOME");
        request.setGenreUuids(List.of(COMEDY_UUID));

        var result = DiscoverScorer.score(movie, request, genres, Set.of());

        assertTrue(result.score() >= 30);
        assertTrue(result.reasons().stream().anyMatch(reason -> reason.contains("Khớp thể loại")));
    }
}
