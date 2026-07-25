package com.thdpv.movietheater.radar.support;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public final class ShowtimeRadarGenreMatcher {

    private ShowtimeRadarGenreMatcher() {
    }

    public static boolean matches(
            List<UUID> selectedGenreUuids,
            Set<UUID> movieGenreUuids,
            Map<UUID, String> genreNamesByUuid) {
        if (selectedGenreUuids == null || selectedGenreUuids.isEmpty()) {
            return false;
        }
        if (movieGenreUuids == null || movieGenreUuids.isEmpty()) {
            return false;
        }
        if (selectedGenreUuids.stream().anyMatch(movieGenreUuids::contains)) {
            return true;
        }

        String combinedMovieGenres = movieGenreUuids.stream()
                .map(genreNamesByUuid::get)
                .filter(Objects::nonNull)
                .map(ShowtimeRadarGenreMatcher::normalize)
                .collect(Collectors.joining(" "));

        return selectedGenreUuids.stream()
                .map(genreNamesByUuid::get)
                .filter(Objects::nonNull)
                .anyMatch(selectedName -> semanticMatch(normalize(selectedName), combinedMovieGenres));
    }

    private static boolean semanticMatch(String selectedGenre, String combinedMovieGenres) {
        if (selectedGenre.isBlank() || combinedMovieGenres.isBlank()) {
            return false;
        }
        String[] tokens = selectedGenre.split("\\s+");
        for (String token : tokens) {
            if (token.length() < 2) {
                continue;
            }
            if (!combinedMovieGenres.contains(token)) {
                return false;
            }
        }
        return tokens.length > 0;
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).trim();
    }
}
