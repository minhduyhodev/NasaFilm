package com.thdpv.movietheater.movie.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.config.cache.CacheNames;
import com.thdpv.movietheater.movie.dto.response.MovieReviewStatsResponse;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;

@Service
public class MovieReviewStatsService {

    private final MovieReviewRepository movieReviewRepository;

    public MovieReviewStatsService(MovieReviewRepository movieReviewRepository) {
        this.movieReviewRepository = movieReviewRepository;
    }

    @Cacheable(value = CacheNames.MOVIE_REVIEW_SUMMARY, key = "#movieUuid")
    @Transactional(readOnly = true)
    public MovieReviewStatsResponse getStats(UUID movieUuid) {
        MovieReviewStatsResponse stats = new MovieReviewStatsResponse();
        long total = movieReviewRepository.countByMovieUuidAndStatus(movieUuid, MovieReviewStatus.VISIBLE);
        stats.setTotalReviews(total);

        double average = total == 0
                ? 0
                : movieReviewRepository.averageRatingByMovieUuidAndStatus(movieUuid, MovieReviewStatus.VISIBLE);
        stats.setAverageRating(Math.round(average * 10.0) / 10.0);
        stats.setRatingDistribution(buildDistribution(movieUuid));
        return stats;
    }

    @Transactional(readOnly = true)
    public Map<UUID, MovieReviewStatsResponse> getStatsBatch(Collection<UUID> movieUuids) {
        if (movieUuids == null || movieUuids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, MovieReviewStatsResponse> result = new HashMap<>();
        for (Object[] row : movieReviewRepository.aggregateByMovieUuids(movieUuids, MovieReviewStatus.VISIBLE)) {
            UUID movieUuid = (UUID) row[0];
            long total = ((Number) row[1]).longValue();
            double average = ((Number) row[2]).doubleValue();
            MovieReviewStatsResponse stats = new MovieReviewStatsResponse();
            stats.setTotalReviews(total);
            stats.setAverageRating(total == 0 ? 0 : Math.round(average * 10.0) / 10.0);
            result.put(movieUuid, stats);
        }
        for (UUID movieUuid : movieUuids) {
            result.putIfAbsent(movieUuid, emptyStats());
        }
        return result;
    }

    private MovieReviewStatsResponse emptyStats() {
        MovieReviewStatsResponse stats = new MovieReviewStatsResponse();
        stats.setTotalReviews(0);
        stats.setAverageRating(0);
        return stats;
    }

    private Map<Integer, Long> buildDistribution(UUID movieUuid) {
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            distribution.put(star, 0L);
        }
        for (Object[] row : movieReviewRepository.countByRatingGroupAndStatus(movieUuid, MovieReviewStatus.VISIBLE)) {
            int rating = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (rating >= 1 && rating <= 5) {
                distribution.put(rating, count);
            }
        }
        return distribution;
    }
}
