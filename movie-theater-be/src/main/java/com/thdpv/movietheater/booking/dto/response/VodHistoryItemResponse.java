package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class VodHistoryItemResponse {

    private UUID movieUuid;
    private String movieTitle;
    private String primaryMediaUrl;
    private Integer positionSeconds;
    private Integer durationSeconds;
    private Integer progressPercent;
    private OffsetDateTime lastWatchedAt;
    private OffsetDateTime expiresAt;

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getPrimaryMediaUrl() {
        return primaryMediaUrl;
    }

    public void setPrimaryMediaUrl(String primaryMediaUrl) {
        this.primaryMediaUrl = primaryMediaUrl;
    }

    public Integer getPositionSeconds() {
        return positionSeconds;
    }

    public void setPositionSeconds(Integer positionSeconds) {
        this.positionSeconds = positionSeconds;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Integer getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(Integer progressPercent) {
        this.progressPercent = progressPercent;
    }

    public OffsetDateTime getLastWatchedAt() {
        return lastWatchedAt;
    }

    public void setLastWatchedAt(OffsetDateTime lastWatchedAt) {
        this.lastWatchedAt = lastWatchedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
