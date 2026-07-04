package com.thdpv.movietheater.mission.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;

public class AdminMissionCampaignResponse {

    private UUID uuid;
    private String code;
    private String title;
    private String description;
    private MissionCampaignStatus status;
    private OffsetDateTime startsAt;
    private OffsetDateTime endsAt;
    private int sortOrder;
    private long templateCount;

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
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

    public long getTemplateCount() {
        return templateCount;
    }

    public void setTemplateCount(long templateCount) {
        this.templateCount = templateCount;
    }
}
