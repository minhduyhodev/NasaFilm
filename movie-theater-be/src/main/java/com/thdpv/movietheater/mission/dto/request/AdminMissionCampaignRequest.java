package com.thdpv.movietheater.mission.dto.request;

import java.time.OffsetDateTime;

import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;

import jakarta.validation.constraints.NotBlank;

public class AdminMissionCampaignRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String title;

    private String description;

    private MissionCampaignStatus status = MissionCampaignStatus.DRAFT;

    private OffsetDateTime startsAt;

    private OffsetDateTime endsAt;

    private int sortOrder;

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

    public MissionCampaignStatus getStatus() {
        return status;
    }

    public void setStatus(MissionCampaignStatus status) {
        this.status = status;
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

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
