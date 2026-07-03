package com.thdpv.movietheater.mission.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;
import com.thdpv.movietheater.mission.enums.MissionConditionType;
import com.thdpv.movietheater.mission.enums.MissionRecurrence;

public class AdminMissionTemplateResponse {

    private UUID uuid;
    private String code;
    private int version;
    private String title;
    private String description;
    private MissionConditionType conditionType;
    private String conditionJson;
    private MissionRecurrence recurrence;
    private UUID campaignUuid;
    private OffsetDateTime startsAt;
    private OffsetDateTime endsAt;
    private int rewardPoints;
    private String rewardBadgeCode;
    private String rewardBadgeTitle;
    private String requiresFeature;
    private int targetValue;
    private boolean active;
    private int sortOrder;
    private long enrolledCount;
    private long completedCount;

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

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
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

    public MissionConditionType getConditionType() {
        return conditionType;
    }

    public void setConditionType(MissionConditionType conditionType) {
        this.conditionType = conditionType;
    }

    public String getConditionJson() {
        return conditionJson;
    }

    public void setConditionJson(String conditionJson) {
        this.conditionJson = conditionJson;
    }

    public MissionRecurrence getRecurrence() {
        return recurrence;
    }

    public void setRecurrence(MissionRecurrence recurrence) {
        this.recurrence = recurrence;
    }

    public UUID getCampaignUuid() {
        return campaignUuid;
    }

    public void setCampaignUuid(UUID campaignUuid) {
        this.campaignUuid = campaignUuid;
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

    public int getRewardPoints() {
        return rewardPoints;
    }

    public void setRewardPoints(int rewardPoints) {
        this.rewardPoints = rewardPoints;
    }

    public String getRewardBadgeCode() {
        return rewardBadgeCode;
    }

    public void setRewardBadgeCode(String rewardBadgeCode) {
        this.rewardBadgeCode = rewardBadgeCode;
    }

    public String getRewardBadgeTitle() {
        return rewardBadgeTitle;
    }

    public void setRewardBadgeTitle(String rewardBadgeTitle) {
        this.rewardBadgeTitle = rewardBadgeTitle;
    }

    public String getRequiresFeature() {
        return requiresFeature;
    }

    public void setRequiresFeature(String requiresFeature) {
        this.requiresFeature = requiresFeature;
    }

    public int getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(int targetValue) {
        this.targetValue = targetValue;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public long getEnrolledCount() {
        return enrolledCount;
    }

    public void setEnrolledCount(long enrolledCount) {
        this.enrolledCount = enrolledCount;
    }

    public long getCompletedCount() {
        return completedCount;
    }

    public void setCompletedCount(long completedCount) {
        this.completedCount = completedCount;
    }
}
