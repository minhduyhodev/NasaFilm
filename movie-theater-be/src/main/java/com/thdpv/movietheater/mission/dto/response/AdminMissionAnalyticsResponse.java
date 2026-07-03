package com.thdpv.movietheater.mission.dto.response;

import java.util.List;

public class AdminMissionAnalyticsResponse {

    private long totalTemplates;
    private long activeTemplates;
    private long deletedTemplates;
    private long totalCampaigns;
    private long liveCampaigns;
    private long totalEnrollments;
    private long totalCompletions;
    private long distinctParticipants;
    private long totalPointsAwarded;
    private double overallCompletionRate;
    private List<AdminMissionTemplateStatResponse> topTemplates;
    private List<AdminMissionCampaignStatResponse> campaignStats;

    public long getTotalTemplates() {
        return totalTemplates;
    }

    public void setTotalTemplates(long totalTemplates) {
        this.totalTemplates = totalTemplates;
    }

    public long getActiveTemplates() {
        return activeTemplates;
    }

    public void setActiveTemplates(long activeTemplates) {
        this.activeTemplates = activeTemplates;
    }

    public long getDeletedTemplates() {
        return deletedTemplates;
    }

    public void setDeletedTemplates(long deletedTemplates) {
        this.deletedTemplates = deletedTemplates;
    }

    public long getTotalCampaigns() {
        return totalCampaigns;
    }

    public void setTotalCampaigns(long totalCampaigns) {
        this.totalCampaigns = totalCampaigns;
    }

    public long getLiveCampaigns() {
        return liveCampaigns;
    }

    public void setLiveCampaigns(long liveCampaigns) {
        this.liveCampaigns = liveCampaigns;
    }

    public long getTotalEnrollments() {
        return totalEnrollments;
    }

    public void setTotalEnrollments(long totalEnrollments) {
        this.totalEnrollments = totalEnrollments;
    }

    public long getTotalCompletions() {
        return totalCompletions;
    }

    public void setTotalCompletions(long totalCompletions) {
        this.totalCompletions = totalCompletions;
    }

    public long getDistinctParticipants() {
        return distinctParticipants;
    }

    public void setDistinctParticipants(long distinctParticipants) {
        this.distinctParticipants = distinctParticipants;
    }

    public long getTotalPointsAwarded() {
        return totalPointsAwarded;
    }

    public void setTotalPointsAwarded(long totalPointsAwarded) {
        this.totalPointsAwarded = totalPointsAwarded;
    }

    public double getOverallCompletionRate() {
        return overallCompletionRate;
    }

    public void setOverallCompletionRate(double overallCompletionRate) {
        this.overallCompletionRate = overallCompletionRate;
    }

    public List<AdminMissionTemplateStatResponse> getTopTemplates() {
        return topTemplates;
    }

    public void setTopTemplates(List<AdminMissionTemplateStatResponse> topTemplates) {
        this.topTemplates = topTemplates;
    }

    public List<AdminMissionCampaignStatResponse> getCampaignStats() {
        return campaignStats;
    }

    public void setCampaignStats(List<AdminMissionCampaignStatResponse> campaignStats) {
        this.campaignStats = campaignStats;
    }
}
