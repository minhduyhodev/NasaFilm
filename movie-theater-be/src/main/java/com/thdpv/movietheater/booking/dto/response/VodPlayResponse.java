package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import com.thdpv.movietheater.mission.dto.response.MissionCompletionResponse;

public class VodPlayResponse {
    private String streamToken;
    private String streamSessionId;
    private String streamingUrl;
    private OffsetDateTime expiresAt;
    private List<MissionCompletionResponse> missionCompletions = new ArrayList<>();

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

    public String getStreamSessionId() {
        return streamSessionId;
    }

    public void setStreamSessionId(String streamSessionId) {
        this.streamSessionId = streamSessionId;
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

    public List<MissionCompletionResponse> getMissionCompletions() {
        return missionCompletions;
    }

    public void setMissionCompletions(List<MissionCompletionResponse> missionCompletions) {
        this.missionCompletions = missionCompletions != null ? missionCompletions : new ArrayList<>();
    }
}
