package com.thdpv.movietheater.mission.dto.response;

public class MissionProgressResponse {

    private int current;
    private int target;
    private String unit;

    public MissionProgressResponse() {
    }

    public MissionProgressResponse(int current, int target, String unit) {
        this.current = current;
        this.target = target;
        this.unit = unit;
    }

    public int getCurrent() {
        return current;
    }

    public void setCurrent(int current) {
        this.current = current;
    }

    public int getTarget() {
        return target;
    }

    public void setTarget(int target) {
        this.target = target;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }
}
