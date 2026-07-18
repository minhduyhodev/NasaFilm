package com.thdpv.movietheater.discover.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class AdminDiscoverQuizSettingsRequest {

    @NotNull
    @Min(1)
    @Max(10)
    private Integer maxMatches;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer maxGenreSelections;

    @NotNull
    @Min(3)
    @Max(5)
    private Integer authenticatedQuestionCount;

    @NotNull
    @Min(3)
    @Max(5)
    private Integer guestQuestionCount;

    public Integer getMaxMatches() {
        return maxMatches;
    }

    public void setMaxMatches(Integer maxMatches) {
        this.maxMatches = maxMatches;
    }

    public Integer getMaxGenreSelections() {
        return maxGenreSelections;
    }

    public void setMaxGenreSelections(Integer maxGenreSelections) {
        this.maxGenreSelections = maxGenreSelections;
    }

    public Integer getAuthenticatedQuestionCount() {
        return authenticatedQuestionCount;
    }

    public void setAuthenticatedQuestionCount(Integer authenticatedQuestionCount) {
        this.authenticatedQuestionCount = authenticatedQuestionCount;
    }

    public Integer getGuestQuestionCount() {
        return guestQuestionCount;
    }

    public void setGuestQuestionCount(Integer guestQuestionCount) {
        this.guestQuestionCount = guestQuestionCount;
    }
}
