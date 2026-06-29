package com.thdpv.movietheater.movie.service;

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
