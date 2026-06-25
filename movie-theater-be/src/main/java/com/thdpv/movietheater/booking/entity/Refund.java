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
@Table(name = "refund", indexes = {
        @Index(name = "idx_refund_booking", columnList = "booking_uuid"),
        @Index(name = "idx_refund_status", columnList = "status")
})
public class Refund {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "booking_uuid", nullable = false)
    private UUID bookingUuid;

    @Column(name = "payment_uuid")
    private UUID paymentUuid;

    @Column(name = "cancellation_request_uuid")
    private UUID cancellationRequestUuid;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "gateway_refund_id")
    private String gatewayRefundId;

    @Column(name = "idempotency_key", unique = true, nullable = false)
    private String idempotencyKey;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "approved_by_uuid")
    private UUID approvedByUuid;

    @Column(name = "approved_by_role")
    private String approvedByRole;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    public Refund() {
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

    public UUID getPaymentUuid() {
        return paymentUuid;
    }

    public void setPaymentUuid(UUID paymentUuid) {
        this.paymentUuid = paymentUuid;
    }

    public UUID getCancellationRequestUuid() {
        return cancellationRequestUuid;
    }

    public void setCancellationRequestUuid(UUID cancellationRequestUuid) {
        this.cancellationRequestUuid = cancellationRequestUuid;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getGatewayRefundId() {
        return gatewayRefundId;
    }

    public void setGatewayRefundId(String gatewayRefundId) {
        this.gatewayRefundId = gatewayRefundId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public UUID getApprovedByUuid() {
        return approvedByUuid;
    }

    public void setApprovedByUuid(UUID approvedByUuid) {
        this.approvedByUuid = approvedByUuid;
    }

    public String getApprovedByRole() {
        return approvedByRole;
    }

    public void setApprovedByRole(String approvedByRole) {
        this.approvedByRole = approvedByRole;
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
