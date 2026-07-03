package com.thdpv.movietheater.mission.dto.response;

import java.time.OffsetDateTime;

public class MissionItemResponse {

    private String code;
    private String title;
    private String description;
    private String status;
    private String visibility;
    private String cycleKey;
    private String recurrence;
    private MissionProgressResponse progress;
    private int rewardPoints;
    private MissionBadgeResponse rewardBadge;
    private OffsetDateTime completedAt;

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public String getCycleKey() {
        return cycleKey;
    }

    public void setCycleKey(String cycleKey) {
        this.cycleKey = cycleKey;
    }

    public String getRecurrence() {
        return recurrence;
    }

    public void setRecurrence(String recurrence) {
        this.recurrence = recurrence;
    }

    public MissionProgressResponse getProgress() {
        return progress;
    }

    public void setProgress(MissionProgressResponse progress) {
        this.progress = progress;
    }

    public int getRewardPoints() {
        return rewardPoints;
    }

    public void setRewardPoints(int rewardPoints) {
        this.rewardPoints = rewardPoints;
    }

    public MissionBadgeResponse getRewardBadge() {
        return rewardBadge;
    }

    public void setRewardBadge(MissionBadgeResponse rewardBadge) {
        this.rewardBadge = rewardBadge;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
