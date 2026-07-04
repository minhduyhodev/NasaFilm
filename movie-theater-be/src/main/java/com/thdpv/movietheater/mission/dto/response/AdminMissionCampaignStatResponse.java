package com.thdpv.movietheater.mission.dto.response;

import java.util.UUID;

public class AdminMissionCampaignStatResponse {

    private UUID uuid;
    private String code;
    private String title;
    private String status;
    private long templateCount;
    private long enrolledCount;
    private long completedCount;

    public AdminMissionCampaignStatResponse() {
    }

    public AdminMissionCampaignStatResponse(
            UUID uuid,
            String code,
            String title,
            String status,
            long templateCount,
            long enrolledCount,
            long completedCount) {
        this.uuid = uuid;
        this.code = code;
        this.title = title;
        this.status = status;
        this.templateCount = templateCount;
        this.enrolledCount = enrolledCount;
        this.completedCount = completedCount;
    }

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public long getTemplateCount() {
        return templateCount;
    }

    public void setTemplateCount(long templateCount) {
        this.templateCount = templateCount;
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
