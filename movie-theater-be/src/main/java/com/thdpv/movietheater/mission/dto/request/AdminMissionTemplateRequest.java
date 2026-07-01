package com.thdpv.movietheater.mission.dto.request;

import com.thdpv.movietheater.mission.enums.MissionConditionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AdminMissionTemplateRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String title;

    private String description;

    @NotNull
    private MissionConditionType conditionType;

    private String conditionJson;

    private int rewardPoints;

    private String rewardBadgeCode;

    private String rewardBadgeTitle;

    private String requiresFeature;

    private int targetValue = 1;

    private boolean active = true;

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
}
