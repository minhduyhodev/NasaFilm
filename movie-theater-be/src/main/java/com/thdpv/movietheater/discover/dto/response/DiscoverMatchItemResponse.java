package com.thdpv.movietheater.discover.dto.response;

import java.util.List;
import java.util.UUID;

public class DiscoverMatchItemResponse {

    private UUID uuid;
    private String title;
    private String primaryMediaUrl;
    private Integer durationMinutes;
    private List<String> genres;
    private String screeningMode;
    private Double rating;
    private Double reviewAverageRating;
    private Long reviewCount;
    private Boolean bestOnBigScreen;
    private int matchScore;
    private List<String> reasons;

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPrimaryMediaUrl() {
        return primaryMediaUrl;
    }

    public void setPrimaryMediaUrl(String primaryMediaUrl) {
        this.primaryMediaUrl = primaryMediaUrl;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public List<String> getGenres() {
        return genres;
    }

    public void setGenres(List<String> genres) {
        this.genres = genres;
    }

    public String getScreeningMode() {
        return screeningMode;
    }

    public void setScreeningMode(String screeningMode) {
        this.screeningMode = screeningMode;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Double getReviewAverageRating() {
        return reviewAverageRating;
    }

    public void setReviewAverageRating(Double reviewAverageRating) {
        this.reviewAverageRating = reviewAverageRating;
    }

    public Long getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Long reviewCount) {
        this.reviewCount = reviewCount;
    }

    public Boolean getBestOnBigScreen() {
        return bestOnBigScreen;
    }

    public void setBestOnBigScreen(Boolean bestOnBigScreen) {
        this.bestOnBigScreen = bestOnBigScreen;
    }

    public int getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(int matchScore) {
        this.matchScore = matchScore;
    }

    public List<String> getReasons() {
        return reasons;
    }

    public void setReasons(List<String> reasons) {
        this.reasons = reasons;
    }
}
