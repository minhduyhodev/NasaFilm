package com.thdpv.movietheater.mission.dto.response;

public class MissionCompletionResponse {

    private String code;
    private String title;
    private int pointsAwarded;
    private MissionBadgeResponse badge;

    public MissionCompletionResponse() {
    }

    public MissionCompletionResponse(String code, String title, int pointsAwarded, MissionBadgeResponse badge) {
        this.code = code;
        this.title = title;
        this.pointsAwarded = pointsAwarded;
        this.badge = badge;
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

    public int getPointsAwarded() {
        return pointsAwarded;
    }

    public void setPointsAwarded(int pointsAwarded) {
        this.pointsAwarded = pointsAwarded;
    }

    public MissionBadgeResponse getBadge() {
        return badge;
    }

    public void setBadge(MissionBadgeResponse badge) {
        this.badge = badge;
    }
}
