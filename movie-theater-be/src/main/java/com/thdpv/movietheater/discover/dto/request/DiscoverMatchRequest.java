package com.thdpv.movietheater.discover.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DiscoverMatchRequest {

    /** RELAX | EXCITING | EMOTIONAL | THRILLING */
    @NotBlank
    private String mood;

    /** SHORT | MEDIUM | LONG */
    @NotBlank
    private String duration;

    /** THEATER | HOME | BOTH */
    @NotBlank
    private String viewingLocation;

    @Size(max = 5)
    private List<UUID> genreUuids;

    private Boolean useHistory;

    public String getMood() {
        return mood;
    }

    public void setMood(String mood) {
        this.mood = mood;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public String getViewingLocation() {
        return viewingLocation;
    }

    public void setViewingLocation(String viewingLocation) {
        this.viewingLocation = viewingLocation;
    }

    public List<UUID> getGenreUuids() {
        return genreUuids;
    }

    public void setGenreUuids(List<UUID> genreUuids) {
        this.genreUuids = genreUuids;
    }

    public Boolean getUseHistory() {
        return useHistory;
    }

    public void setUseHistory(Boolean useHistory) {
        this.useHistory = useHistory;
    }
}
