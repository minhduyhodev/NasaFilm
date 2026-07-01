package com.thdpv.movietheater.mission.dto.response;

import java.util.ArrayList;
import java.util.List;

public class MissionBoardResponse {

    private MissionTierResponse tier;
    private List<MissionItemResponse> missions = new ArrayList<>();
    private List<MissionCompletionResponse> recentCompletions = new ArrayList<>();

    public MissionTierResponse getTier() {
        return tier;
    }

    public void setTier(MissionTierResponse tier) {
        this.tier = tier;
    }

    public List<MissionItemResponse> getMissions() {
        return missions;
    }

    public void setMissions(List<MissionItemResponse> missions) {
        this.missions = missions;
    }

    public List<MissionCompletionResponse> getRecentCompletions() {
        return recentCompletions;
    }

    public void setRecentCompletions(List<MissionCompletionResponse> recentCompletions) {
        this.recentCompletions = recentCompletions;
    }
}
