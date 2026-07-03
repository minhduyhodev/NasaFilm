package com.thdpv.movietheater.mission.dto.response;

import java.util.ArrayList;
import java.util.List;

public class MissionBoardResponse {

    private MissionTierResponse tier;
    private MissionCampaignResponse campaign;
    private MissionBoardSummaryResponse summary;
    private List<MissionItemResponse> missions = new ArrayList<>();
    private List<MissionItemResponse> activeMissions = new ArrayList<>();
    private List<MissionItemResponse> completedMissions = new ArrayList<>();
    private List<MissionBadgeResponse> badges = new ArrayList<>();
    private List<MissionCompletionResponse> recentCompletions = new ArrayList<>();

    public MissionTierResponse getTier() {
        return tier;
    }

    public void setTier(MissionTierResponse tier) {
        this.tier = tier;
    }

    public MissionCampaignResponse getCampaign() {
        return campaign;
    }

    public void setCampaign(MissionCampaignResponse campaign) {
        this.campaign = campaign;
    }

    public MissionBoardSummaryResponse getSummary() {
        return summary;
    }

    public void setSummary(MissionBoardSummaryResponse summary) {
        this.summary = summary;
    }

    public List<MissionItemResponse> getMissions() {
        return missions;
    }

    public void setMissions(List<MissionItemResponse> missions) {
        this.missions = missions;
    }

    public List<MissionItemResponse> getActiveMissions() {
        return activeMissions;
    }

    public void setActiveMissions(List<MissionItemResponse> activeMissions) {
        this.activeMissions = activeMissions;
    }

    public List<MissionItemResponse> getCompletedMissions() {
        return completedMissions;
    }

    public void setCompletedMissions(List<MissionItemResponse> completedMissions) {
        this.completedMissions = completedMissions;
    }

    public List<MissionBadgeResponse> getBadges() {
        return badges;
    }

    public void setBadges(List<MissionBadgeResponse> badges) {
        this.badges = badges;
    }

    public List<MissionCompletionResponse> getRecentCompletions() {
        return recentCompletions;
    }

    public void setRecentCompletions(List<MissionCompletionResponse> recentCompletions) {
        this.recentCompletions = recentCompletions;
    }
}
