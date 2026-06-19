package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;

public class VodPlayResponse {
    private String streamToken;
    private String streamingUrl;
    private OffsetDateTime expiresAt;

    public VodPlayResponse() {
    }

    public VodPlayResponse(String streamToken, String streamingUrl, OffsetDateTime expiresAt) {
        this.streamToken = streamToken;
        this.streamingUrl = streamingUrl;
        this.expiresAt = expiresAt;
    }

    public String getStreamToken() {
        return streamToken;
    }

    public void setStreamToken(String streamToken) {
        this.streamToken = streamToken;
    }

    public String getStreamingUrl() {
        return streamingUrl;
    }

    public void setStreamingUrl(String streamingUrl) {
        this.streamingUrl = streamingUrl;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
