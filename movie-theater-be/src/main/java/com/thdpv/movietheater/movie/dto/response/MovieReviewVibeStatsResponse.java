package com.thdpv.movietheater.movie.dto.response;

import java.util.Map;

public class MovieReviewVibeStatsResponse {

    private Map<String, Long> vibeTagCounts;
    private long taggedReviewCount;
    private boolean bestOnBigScreen;

    public Map<String, Long> getVibeTagCounts() {
        return vibeTagCounts;
    }

    public void setVibeTagCounts(Map<String, Long> vibeTagCounts) {
        this.vibeTagCounts = vibeTagCounts;
    }

    public long getTaggedReviewCount() {
        return taggedReviewCount;
    }

    public void setTaggedReviewCount(long taggedReviewCount) {
        this.taggedReviewCount = taggedReviewCount;
    }

    public boolean isBestOnBigScreen() {
        return bestOnBigScreen;
    }

    public void setBestOnBigScreen(boolean bestOnBigScreen) {
        this.bestOnBigScreen = bestOnBigScreen;
    }
}
