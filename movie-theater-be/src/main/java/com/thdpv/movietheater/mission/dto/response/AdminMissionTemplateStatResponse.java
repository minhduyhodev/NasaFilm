package com.thdpv.movietheater.mission.dto.response;

public class AdminMissionTemplateStatResponse {

    private String code;
    private String title;
    private long enrolledCount;
    private long completedCount;
    private double completionRate;

    public AdminMissionTemplateStatResponse() {
    }

    public AdminMissionTemplateStatResponse(
            String code, String title, long enrolledCount, long completedCount, double completionRate) {
        this.code = code;
        this.title = title;
        this.enrolledCount = enrolledCount;
        this.completedCount = completedCount;
        this.completionRate = completionRate;
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

    public double getCompletionRate() {
        return completionRate;
    }

    public void setCompletionRate(double completionRate) {
        this.completionRate = completionRate;
    }
}
