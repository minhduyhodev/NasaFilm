package com.thdpv.movietheater.radar.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class ShowtimeRadarFavoriteMatcherTest {

    private final UUID movieUuid = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID otherMovieUuid = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID actionGenre = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID dramaGenre = UUID.fromString("44444444-4444-4444-4444-444444444444");

    @Test
    void matchesFavoriteMovie_whenUuidInFavorites() {
        assertTrue(ShowtimeRadarFavoriteMatcher.matchesFavoriteMovie(
                movieUuid, Set.of(movieUuid, otherMovieUuid)));
    }

    @Test
    void matchesFavoriteGenre_whenSharesGenreWithFavorites() {
        assertTrue(ShowtimeRadarFavoriteMatcher.matchesFavoriteGenre(
                Set.of(actionGenre),
                Set.of(actionGenre, dramaGenre),
                false));
    }

    @Test
    void doesNotMatchFavoriteGenre_whenAlreadyFavoriteMovie() {
        assertFalse(ShowtimeRadarFavoriteMatcher.matchesFavoriteGenre(
                Set.of(actionGenre),
                Set.of(actionGenre),
                true));
    }
}
