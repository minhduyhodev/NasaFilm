package com.thdpv.movietheater.movie.util;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieMedia;

public final class MovieStreamingUtils {

    private static final Set<String> PRIMARY_STREAM_MEDIA_TYPES = Set.of(
            "STREAM", "FULL_MOVIE", "VIDEO", "ONLINE", "MOVIE");

    private MovieStreamingUtils() {
    }

    public static String resolveStreamingUrl(Movie movie) {
        if (movie == null) {
            return null;
        }

        String directUrl = trimToNull(movie.getStreamingUrl());
        if (S3MediaBorderUtils.isAwsMovieStreamingUrl(directUrl)) {
            return directUrl;
        }

        List<MovieMedia> medias = movie.getMovieMedias();
        if (medias == null || medias.isEmpty()) {
            return null;
        }

        return medias.stream()
                .filter(Objects::nonNull)
                .filter(media -> matchesMediaType(media.getMediaType(), PRIMARY_STREAM_MEDIA_TYPES)
                        || (media.getMediaUrl() != null
                                && media.getMediaUrl().toLowerCase(Locale.ROOT).contains("/movie/")))
                .sorted(Comparator.comparingInt(media -> media.getSortOrder() != null ? media.getSortOrder() : 0))
                .map(MovieMedia::getMediaUrl)
                .map(MovieStreamingUtils::trimToNull)
                .filter(S3MediaBorderUtils::isAwsMovieStreamingUrl)
                .findFirst()
                .orElse(null);
    }

    public static String resolveFromMediaRequests(List<MovieMediaRequest> medias) {
        if (medias == null || medias.isEmpty()) {
            return null;
        }

        return medias.stream()
                .filter(Objects::nonNull)
                .filter(media -> matchesMediaType(media.getMediaType(), PRIMARY_STREAM_MEDIA_TYPES)
                        || (media.getMediaUrl() != null
                                && media.getMediaUrl().toLowerCase(Locale.ROOT).contains("/movie/")))
                .sorted(Comparator.comparingInt(media -> media.getSortOrder() != null ? media.getSortOrder() : 0))
                .map(MovieMediaRequest::getMediaUrl)
                .map(MovieStreamingUtils::trimToNull)
                .filter(S3MediaBorderUtils::isAwsMovieStreamingUrl)
                .findFirst()
                .orElse(null);
    }

    private static boolean matchesMediaType(String mediaType, Set<String> allowedTypes) {
        if (mediaType == null || mediaType.isBlank()) {
            return false;
        }
        return allowedTypes.contains(mediaType.trim().toUpperCase(Locale.ROOT));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
