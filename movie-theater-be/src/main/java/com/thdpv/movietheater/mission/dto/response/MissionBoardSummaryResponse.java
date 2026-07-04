package com.thdpv.movietheater.mission.dto.response;

public class MissionBoardSummaryResponse {

    private int activeCount;
    private int completedCount;
    private int totalVisibleCount;
    private boolean allCompleted;

    public MissionBoardSummaryResponse() {
    }

    public MissionBoardSummaryResponse(int activeCount, int completedCount, int totalVisibleCount, boolean allCompleted) {
        this.activeCount = activeCount;
        this.completedCount = completedCount;
        this.totalVisibleCount = totalVisibleCount;
        this.allCompleted = allCompleted;
    }

    public int getActiveCount() {
        return activeCount;
    }

    public void setActiveCount(int activeCount) {
        this.activeCount = activeCount;
    }

    public int getCompletedCount() {
        return completedCount;
    }

    public void setCompletedCount(int completedCount) {
        this.completedCount = completedCount;
    }

    public int getTotalVisibleCount() {
        return totalVisibleCount;
    }

    public void setTotalVisibleCount(int totalVisibleCount) {
        this.totalVisibleCount = totalVisibleCount;
    }

    public boolean isAllCompleted() {
        return allCompleted;
    }

    public void setAllCompleted(boolean allCompleted) {
        this.allCompleted = allCompleted;
    }
}
