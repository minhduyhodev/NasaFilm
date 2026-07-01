package com.thdpv.movietheater.movie.dto.response;

import java.util.LinkedHashMap;
import java.util.Map;

public class MovieReviewSummaryResponse {

    private double averageRating;
    private long totalReviews;
    private Map<Integer, Long> ratingDistribution = new LinkedHashMap<>();
    private Map<String, Long> vibeTagCounts = new LinkedHashMap<>();
    private boolean bestOnBigScreen;
    private MovieReviewResponse myReview;
    private boolean canReview;
    private boolean reviewCooldownActive;
    private String reviewEligibilityMessage;

    public MovieReviewSummaryResponse() {
    }

    public double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(double averageRating) {
        this.averageRating = averageRating;
    }

    public long getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(long totalReviews) {
        this.totalReviews = totalReviews;
    }

    public Map<Integer, Long> getRatingDistribution() {
        return ratingDistribution;
    }

    public void setRatingDistribution(Map<Integer, Long> ratingDistribution) {
        this.ratingDistribution = ratingDistribution;
    }

    public Map<String, Long> getVibeTagCounts() {
        return vibeTagCounts;
    }

    public void setVibeTagCounts(Map<String, Long> vibeTagCounts) {
        this.vibeTagCounts = vibeTagCounts;
    }

    public boolean isBestOnBigScreen() {
        return bestOnBigScreen;
    }

    public void setBestOnBigScreen(boolean bestOnBigScreen) {
        this.bestOnBigScreen = bestOnBigScreen;
    }

    public MovieReviewResponse getMyReview() {
        return myReview;
    }

    public void setMyReview(MovieReviewResponse myReview) {
        this.myReview = myReview;
    }

    public boolean isCanReview() {
        return canReview;
    }

    public void setCanReview(boolean canReview) {
        this.canReview = canReview;
    }

    public boolean isReviewCooldownActive() {
        return reviewCooldownActive;
    }

    public void setReviewCooldownActive(boolean reviewCooldownActive) {
        this.reviewCooldownActive = reviewCooldownActive;
    }

    public String getReviewEligibilityMessage() {
        return reviewEligibilityMessage;
    }

    public void setReviewEligibilityMessage(String reviewEligibilityMessage) {
        this.reviewEligibilityMessage = reviewEligibilityMessage;
    }
}
