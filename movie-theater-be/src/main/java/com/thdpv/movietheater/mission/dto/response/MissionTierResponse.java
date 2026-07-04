package com.thdpv.movietheater.mission.dto.response;

public class MissionTierResponse {

    private String code;
    private String label;
    private int lifetimeScore;
    private int nextTierAt;

    public MissionTierResponse() {
    }

    public MissionTierResponse(String code, String label, int lifetimeScore, int nextTierAt) {
        this.code = code;
        this.label = label;
        this.lifetimeScore = lifetimeScore;
        this.nextTierAt = nextTierAt;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public int getLifetimeScore() {
        return lifetimeScore;
    }

    public void setLifetimeScore(int lifetimeScore) {
        this.lifetimeScore = lifetimeScore;
    }

    public int getNextTierAt() {
        return nextTierAt;
    }

    public void setNextTierAt(int nextTierAt) {
        this.nextTierAt = nextTierAt;
    }
}
