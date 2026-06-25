package com.thdpv.movietheater.movie.dto.response;

import java.util.UUID;

public class MovieSummaryResponse {

    private UUID uuid;
    private String title;
    private String ageRestriction;
    private String primaryMediaUrl;

    public MovieSummaryResponse() {
    }

    public MovieSummaryResponse(UUID uuid, String title, String ageRestriction, String primaryMediaUrl) {
        this.uuid = uuid;
        this.title = title;
        this.ageRestriction = ageRestriction;
        this.primaryMediaUrl = primaryMediaUrl;
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
}
