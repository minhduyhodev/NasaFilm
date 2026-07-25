package com.thdpv.movietheater.movie.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class MovieListResponse {

    private UUID uuid;
    private String title;
    private String slug;
    private String description;
    private Integer durationMinutes;
    private LocalDate releaseDate;
    private String status;
    private String ageRestriction;
    private String primaryMediaUrl;
    private List<String> genres;
    private List<String> countries;
    private String streamingUrl;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String screeningMode;
    private BigDecimal onlinePrice;
    private Double rating;
    private Double reviewAverageRating;
    private Long reviewCount;
    private Boolean bestOnBigScreen;
    private OffsetDateTime nextShowtimeStart;

    public MovieListResponse() {
    }

    public MovieListResponse(UUID uuid, String title, String description, Integer durationMinutes,
            LocalDate releaseDate, String status, String ageRestriction, String primaryMediaUrl, List<String> genres, List<String> countries,
            OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this(uuid, title, description, durationMinutes, releaseDate, status, ageRestriction, primaryMediaUrl, genres, countries, null, createdAt, updatedAt);
    }

    public MovieListResponse(UUID uuid, String title, String description, Integer durationMinutes,
            LocalDate releaseDate, String status, String ageRestriction, String primaryMediaUrl, List<String> genres, List<String> countries,
            String streamingUrl, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.uuid = uuid;
        this.title = title;
        this.description = description;
        this.durationMinutes = durationMinutes;
        this.releaseDate = releaseDate;
        this.status = status;
        this.ageRestriction = ageRestriction;
        this.primaryMediaUrl = primaryMediaUrl;
        this.genres = genres;
        this.countries = countries;
        this.streamingUrl = streamingUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public LocalDate getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(LocalDate releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAgeRestriction() {
        return ageRestriction;
    }

    public void setAgeRestriction(String ageRestriction) {
        this.ageRestriction = ageRestriction;
    }

    public String getPrimaryMediaUrl() {
        return primaryMediaUrl;
    }

    public void setPrimaryMediaUrl(String primaryMediaUrl) {
        this.primaryMediaUrl = primaryMediaUrl;
    }

    public List<String> getGenres() {
        return genres;
    }

    public void setGenres(List<String> genres) {
        this.genres = genres;
    }

    public List<String> getCountries() {
        return countries;
    }

    public void setCountries(List<String> countries) {
        this.countries = countries;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getStreamingUrl() {
        return streamingUrl;
    }

    public void setStreamingUrl(String streamingUrl) {
        this.streamingUrl = streamingUrl;
    }

    public String getScreeningMode() {
        return screeningMode;
    }

    public void setScreeningMode(String screeningMode) {
        this.screeningMode = screeningMode;
    }

    public BigDecimal getOnlinePrice() {
        return onlinePrice;
    }

    public void setOnlinePrice(BigDecimal onlinePrice) {
        this.onlinePrice = onlinePrice;
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

    public OffsetDateTime getNextShowtimeStart() {
        return nextShowtimeStart;
    }

    public void setNextShowtimeStart(OffsetDateTime nextShowtimeStart) {
        this.nextShowtimeStart = nextShowtimeStart;
    }
}
