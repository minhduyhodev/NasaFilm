package com.thdpv.movietheater.movie.dto.response;

import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.Map;

public class MovieReviewStatsResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private long totalReviews;
    private double averageRating;
    private Map<Integer, Long> ratingDistribution = new LinkedHashMap<>();

    public MovieReviewStatsResponse() {
    }

    public long getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(long totalReviews) {
        this.totalReviews = totalReviews;
    }

    public double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(double averageRating) {
        this.averageRating = averageRating;
    }

    public Map<Integer, Long> getRatingDistribution() {
        return ratingDistribution;
    }

    public void setRatingDistribution(Map<Integer, Long> ratingDistribution) {
        this.ratingDistribution = ratingDistribution;
    }
}
