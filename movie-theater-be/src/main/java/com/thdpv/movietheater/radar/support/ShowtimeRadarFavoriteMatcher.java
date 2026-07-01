package com.thdpv.movietheater.radar.support;

import java.util.Set;
import java.util.UUID;

public final class ShowtimeRadarFavoriteMatcher {

    private ShowtimeRadarFavoriteMatcher() {
    }

    public static boolean matchesFavoriteMovie(UUID movieUuid, Set<UUID> favoriteMovieUuids) {
        return movieUuid != null
                && favoriteMovieUuids != null
                && favoriteMovieUuids.contains(movieUuid);
    }

    public static boolean matchesFavoriteGenre(
            Set<UUID> movieGenreUuids,
            Set<UUID> favoriteGenreUuids,
            boolean alreadyFavoriteMovie) {
        if (alreadyFavoriteMovie) {
            return false;
        }
        if (movieGenreUuids == null || movieGenreUuids.isEmpty()) {
            return false;
        }
        if (favoriteGenreUuids == null || favoriteGenreUuids.isEmpty()) {
            return false;
        }
        return movieGenreUuids.stream().anyMatch(favoriteGenreUuids::contains);
    }

    public static boolean hasFavoriteSignal(
            boolean favoriteMovieMatch,
            boolean favoriteGenreMatch) {
        return favoriteMovieMatch || favoriteGenreMatch;
    }
}
