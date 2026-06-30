package com.thdpv.movietheater.movie.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class FavoriteMovieResponse {

    private UUID movieUuid;
    private String title;
    private String primaryMediaUrl;
    private String ageRestriction;
    private OffsetDateTime favoritedAt;

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
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

    public String getAgeRestriction() {
        return ageRestriction;
    }

    public void setAgeRestriction(String ageRestriction) {
        this.ageRestriction = ageRestriction;
    }

    public OffsetDateTime getFavoritedAt() {
        return favoritedAt;
    }

    public void setFavoritedAt(OffsetDateTime favoritedAt) {
        this.favoritedAt = favoritedAt;
    }
}
