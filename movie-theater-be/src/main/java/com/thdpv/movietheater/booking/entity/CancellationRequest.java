package com.thdpv.movietheater.booking.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "cancellation_request", indexes = {
        @Index(name = "idx_cancel_req_booking", columnList = "booking_uuid"),
        @Index(name = "idx_cancel_req_status", columnList = "status")
})
public class CancellationRequest {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "booking_uuid", nullable = false)
    private UUID bookingUuid;

    @Column(name = "requested_by_uuid", nullable = false)
    private UUID requestedByUuid;

    @Column(name = "reason")
    private String reason;

    @Column(name = "cancellation_fee", nullable = false)
    private BigDecimal cancellationFee;

    @Column(name = "refund_amount", nullable = false)
    private BigDecimal refundAmount;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "initiated_by_role")
    private String initiatedByRole;

    @Column(name = "showtime_cancelled")
    private Boolean showtimeCancelled = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    public CancellationRequest() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public UUID getRequestedByUuid() {
        return requestedByUuid;
    }

    public void setRequestedByUuid(UUID requestedByUuid) {
        this.requestedByUuid = requestedByUuid;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public BigDecimal getCancellationFee() {
        return cancellationFee;
    }

    public void setCancellationFee(BigDecimal cancellationFee) {
        this.cancellationFee = cancellationFee;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(BigDecimal refundAmount) {
        this.refundAmount = refundAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getInitiatedByRole() {
        return initiatedByRole;
    }

    public void setInitiatedByRole(String initiatedByRole) {
        this.initiatedByRole = initiatedByRole;
    }

    public Boolean getShowtimeCancelled() {
        return showtimeCancelled;
    }

    public void setShowtimeCancelled(Boolean showtimeCancelled) {
        this.showtimeCancelled = showtimeCancelled;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
