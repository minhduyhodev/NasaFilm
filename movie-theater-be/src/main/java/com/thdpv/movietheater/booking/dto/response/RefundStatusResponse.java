package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class RefundStatusResponse {

    private UUID bookingUuid;
    private String bookingStatus;
    private UUID cancellationRequestUuid;
    private UUID refundUuid;
    private String refundStatus;
    private BigDecimal refundAmount;
    private BigDecimal cancellationFee;
    private OffsetDateTime requestedAt;
    private OffsetDateTime completedAt;
    private List<RefundTimelineItem> timeline;

    public RefundStatusResponse() {
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public String getBookingStatus() {
        return bookingStatus;
    }

    public void setBookingStatus(String bookingStatus) {
        this.bookingStatus = bookingStatus;
    }

    public UUID getCancellationRequestUuid() {
        return cancellationRequestUuid;
    }

    public void setCancellationRequestUuid(UUID cancellationRequestUuid) {
        this.cancellationRequestUuid = cancellationRequestUuid;
    }

    public UUID getRefundUuid() {
        return refundUuid;
    }

    public void setRefundUuid(UUID refundUuid) {
        this.refundUuid = refundUuid;
    }

    public String getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(String refundStatus) {
        this.refundStatus = refundStatus;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(BigDecimal refundAmount) {
        this.refundAmount = refundAmount;
    }

    public BigDecimal getCancellationFee() {
        return cancellationFee;
    }

    public void setCancellationFee(BigDecimal cancellationFee) {
        this.cancellationFee = cancellationFee;
    }

    public OffsetDateTime getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(OffsetDateTime requestedAt) {
        this.requestedAt = requestedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public List<RefundTimelineItem> getTimeline() {
        return timeline;
    }

    public void setTimeline(List<RefundTimelineItem> timeline) {
        this.timeline = timeline;
    }

    public record RefundTimelineItem(String status, String label, OffsetDateTime at) {
    }
}
