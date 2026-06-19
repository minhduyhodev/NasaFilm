package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;

public class VodStatusResponse {
    private boolean hasPurchased;
    private String playbackState;
    private OffsetDateTime firstPlayedAt;
    private OffsetDateTime expiresAt;
    private String streamingUrl;

    public VodStatusResponse() {
    }

    public VodStatusResponse(boolean hasPurchased, String playbackState, OffsetDateTime firstPlayedAt,
            OffsetDateTime expiresAt, String streamingUrl) {
        this.hasPurchased = hasPurchased;
        this.playbackState = playbackState;
        this.firstPlayedAt = firstPlayedAt;
        this.expiresAt = expiresAt;
        this.streamingUrl = streamingUrl;
    }

    public boolean isHasPurchased() {
        return hasPurchased;
    }

    public void setHasPurchased(boolean hasPurchased) {
        this.hasPurchased = hasPurchased;
    }

    public String getPlaybackState() {
        return playbackState;
    }

    public void setPlaybackState(String playbackState) {
        this.playbackState = playbackState;
    }

    public OffsetDateTime getFirstPlayedAt() {
        return firstPlayedAt;
    }

    public void setFirstPlayedAt(OffsetDateTime firstPlayedAt) {
        this.firstPlayedAt = firstPlayedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getStreamingUrl() {
        return streamingUrl;
    }

    public void setStreamingUrl(String streamingUrl) {
        this.streamingUrl = streamingUrl;
    }
}
