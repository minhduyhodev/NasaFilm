package com.thdpv.movietheater.config;

import java.time.OffsetDateTime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.movie.dto.response.ReviewModerationMessage;
import com.thdpv.movietheater.movie.repository.MovieReviewReportRepository;
import com.thdpv.movietheater.movie.enums.MovieReviewReportStatus;

@Component
public class ReviewModerationRealtimeBroadcaster {

    public static final String TOPIC_ADMIN_REVIEW_REPORTS = "/topic/admin/review-reports";

    private final SimpMessagingTemplate messagingTemplate;
    private final MovieReviewReportRepository movieReviewReportRepository;

    public ReviewModerationRealtimeBroadcaster(
            SimpMessagingTemplate messagingTemplate,
            MovieReviewReportRepository movieReviewReportRepository) {
        this.messagingTemplate = messagingTemplate;
        this.movieReviewReportRepository = movieReviewReportRepository;
    }

    public void publish(String eventType) {
        long pendingCount = movieReviewReportRepository.countByStatus(MovieReviewReportStatus.PENDING);
        ReviewModerationMessage message = new ReviewModerationMessage(
                eventType, pendingCount, OffsetDateTime.now());
        messagingTemplate.convertAndSend(TOPIC_ADMIN_REVIEW_REPORTS, message);
    }
}
