package com.thdpv.movietheater.mission.dto.response;

public class MissionBadgeResponse {

    private String code;
    private String title;

    public MissionBadgeResponse() {
    }

    public MissionBadgeResponse(String code, String title) {
        this.code = code;
        this.title = title;
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
}
