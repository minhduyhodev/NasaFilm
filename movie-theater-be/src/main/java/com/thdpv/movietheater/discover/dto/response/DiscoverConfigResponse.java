package com.thdpv.movietheater.discover.dto.response;

import java.util.List;

public class DiscoverConfigResponse {

    private int maxMatches;
    private int maxGenreSelections;
    private int authenticatedQuestionCount;
    private int guestQuestionCount;
    private List<String> moods;
    private List<String> durations;
    private List<String> viewingLocations;
    private List<DiscoverQuizOptionResponse> moodOptions;
    private List<DiscoverQuizOptionResponse> durationOptions;
    private List<DiscoverQuizOptionResponse> viewingOptions;

    public int getMaxMatches() {
        return maxMatches;
    }

    public void setMaxMatches(int maxMatches) {
        this.maxMatches = maxMatches;
    }

    public int getMaxGenreSelections() {
        return maxGenreSelections;
    }

    public void setMaxGenreSelections(int maxGenreSelections) {
        this.maxGenreSelections = maxGenreSelections;
    }

    public int getAuthenticatedQuestionCount() {
        return authenticatedQuestionCount;
    }

    public void setAuthenticatedQuestionCount(int authenticatedQuestionCount) {
        this.authenticatedQuestionCount = authenticatedQuestionCount;
    }

    public int getGuestQuestionCount() {
        return guestQuestionCount;
    }

    public void setGuestQuestionCount(int guestQuestionCount) {
        this.guestQuestionCount = guestQuestionCount;
    }

    public List<String> getMoods() {
        return moods;
    }

    public void setMoods(List<String> moods) {
        this.moods = moods;
    }

    public List<String> getDurations() {
        return durations;
    }

    public void setDurations(List<String> durations) {
        this.durations = durations;
    }

    public List<String> getViewingLocations() {
        return viewingLocations;
    }

    public void setViewingLocations(List<String> viewingLocations) {
        this.viewingLocations = viewingLocations;
    }

    public List<DiscoverQuizOptionResponse> getMoodOptions() {
        return moodOptions;
    }

    public void setMoodOptions(List<DiscoverQuizOptionResponse> moodOptions) {
        this.moodOptions = moodOptions;
    }

    public List<DiscoverQuizOptionResponse> getDurationOptions() {
        return durationOptions;
    }

    public void setDurationOptions(List<DiscoverQuizOptionResponse> durationOptions) {
        this.durationOptions = durationOptions;
    }

    public List<DiscoverQuizOptionResponse> getViewingOptions() {
        return viewingOptions;
    }

    public void setViewingOptions(List<DiscoverQuizOptionResponse> viewingOptions) {
        this.viewingOptions = viewingOptions;
    }
}
