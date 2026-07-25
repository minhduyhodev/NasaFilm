package com.thdpv.movietheater.discover.dto.response;

import java.util.List;

public class AdminDiscoverAnalyticsResponse {

    private final long totalQuizzes;
    private final long authenticatedQuizzes;
    private final long guestQuizzes;
    private final long quizzesLast7Days;
    private final List<DiscoverDistributionItemResponse> moodDistribution;
    private final List<DiscoverDistributionItemResponse> viewingDistribution;

    public AdminDiscoverAnalyticsResponse(
            long totalQuizzes,
            long authenticatedQuizzes,
            long guestQuizzes,
            long quizzesLast7Days,
            List<DiscoverDistributionItemResponse> moodDistribution,
            List<DiscoverDistributionItemResponse> viewingDistribution) {
        this.totalQuizzes = totalQuizzes;
        this.authenticatedQuizzes = authenticatedQuizzes;
        this.guestQuizzes = guestQuizzes;
        this.quizzesLast7Days = quizzesLast7Days;
        this.moodDistribution = moodDistribution;
        this.viewingDistribution = viewingDistribution;
    }

    public long getTotalQuizzes() {
        return totalQuizzes;
    }

    public long getAuthenticatedQuizzes() {
        return authenticatedQuizzes;
    }

    public long getGuestQuizzes() {
        return guestQuizzes;
    }

    public long getQuizzesLast7Days() {
        return quizzesLast7Days;
    }

    public List<DiscoverDistributionItemResponse> getMoodDistribution() {
        return moodDistribution;
    }

    public List<DiscoverDistributionItemResponse> getViewingDistribution() {
        return viewingDistribution;
    }
}
