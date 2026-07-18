package com.thdpv.movietheater.discover.dto.response;

import java.util.List;

public class AdminDiscoverQuizConfigResponse {

    private int maxMatches;
    private int maxGenreSelections;
    private int authenticatedQuestionCount;
    private int guestQuestionCount;
    private List<DiscoverQuizOptionResponse> options;

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

    public List<DiscoverQuizOptionResponse> getOptions() {
        return options;
    }

    public void setOptions(List<DiscoverQuizOptionResponse> options) {
        this.options = options;
    }
}
