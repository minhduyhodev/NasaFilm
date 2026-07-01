package com.thdpv.movietheater.movie.dto.response;

import java.time.OffsetDateTime;

public class ReviewModerationMessage {

    private String eventType;
    private long pendingCount;
    private OffsetDateTime occurredAt;

    public ReviewModerationMessage() {
    }

    public ReviewModerationMessage(String eventType, long pendingCount, OffsetDateTime occurredAt) {
        this.eventType = eventType;
        this.pendingCount = pendingCount;
        this.occurredAt = occurredAt;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public long getPendingCount() {
        return pendingCount;
    }

    public void setPendingCount(long pendingCount) {
        this.pendingCount = pendingCount;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(OffsetDateTime occurredAt) {
        this.occurredAt = occurredAt;
    }
}
