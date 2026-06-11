package com.thdpv.movietheater.movie.dto.response;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class MovieListResponse {

    private UUID uuid;
    private String title;
    private String description;
    private Integer durationMinutes;
    private LocalDate releaseDate;
    private String status;
    private String primaryMediaUrl;
    private List<String> genres;
    private List<String> countries;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public MovieListResponse() {
    }

    public MovieListResponse(UUID uuid, String title, String description, Integer durationMinutes,
            LocalDate releaseDate, String status, String primaryMediaUrl, List<String> genres, List<String> countries,
            OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.uuid = uuid;
        this.title = title;
        this.description = description;
        this.durationMinutes = durationMinutes;
        this.releaseDate = releaseDate;
        this.status = status;
        this.primaryMediaUrl = primaryMediaUrl;
        this.genres = genres;
        this.countries = countries;
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
}
