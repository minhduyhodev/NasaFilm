package com.thdpv.movietheater.mission.dto.response;

import java.time.OffsetDateTime;

public class MissionCampaignResponse {

    private String code;
    private String title;
    private String description;
    private OffsetDateTime startsAt;
    private OffsetDateTime endsAt;

    public MissionCampaignResponse() {
    }

    public MissionCampaignResponse(
            String code, String title, String description, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        this.code = code;
        this.title = title;
        this.description = description;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
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

    public OffsetDateTime getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(OffsetDateTime startsAt) {
        this.startsAt = startsAt;
    }

    public OffsetDateTime getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(OffsetDateTime endsAt) {
        this.endsAt = endsAt;
    }
}
