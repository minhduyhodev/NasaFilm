package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class CancellationPreviewResponse {

    private UUID bookingUuid;
    private boolean cancellable;
    private String message;
    private BigDecimal totalPaid;
    private BigDecimal cancellationFee;
    private BigDecimal refundAmount;
    private int cancellationCutoffMinutes;
    private OffsetDateTime showtimeStart;
    private boolean refundable;
    private List<String> blockedReasons;
    private String bookingType;
    private boolean vodActivated;
    private boolean manualApprovalRequired;

    public CancellationPreviewResponse() {
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public boolean isCancellable() {
        return cancellable;
    }

    public void setCancellable(boolean cancellable) {
        this.cancellable = cancellable;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public BigDecimal getTotalPaid() {
        return totalPaid;
    }

    public void setTotalPaid(BigDecimal totalPaid) {
        this.totalPaid = totalPaid;
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

    public int getCancellationCutoffMinutes() {
        return cancellationCutoffMinutes;
    }

    public void setCancellationCutoffMinutes(int cancellationCutoffMinutes) {
        this.cancellationCutoffMinutes = cancellationCutoffMinutes;
    }

    public OffsetDateTime getShowtimeStart() {
        return showtimeStart;
    }

    public void setShowtimeStart(OffsetDateTime showtimeStart) {
        this.showtimeStart = showtimeStart;
    }

    public boolean isRefundable() {
        return refundable;
    }

    public void setRefundable(boolean refundable) {
        this.refundable = refundable;
    }

    public List<String> getBlockedReasons() {
        return blockedReasons;
    }

    public void setBlockedReasons(List<String> blockedReasons) {
        this.blockedReasons = blockedReasons;
    }

    public String getBookingType() {
        return bookingType;
    }

    public void setBookingType(String bookingType) {
        this.bookingType = bookingType;
    }

    public boolean isVodActivated() {
        return vodActivated;
    }

    public void setVodActivated(boolean vodActivated) {
        this.vodActivated = vodActivated;
    }

    public boolean isManualApprovalRequired() {
        return manualApprovalRequired;
    }

    public void setManualApprovalRequired(boolean manualApprovalRequired) {
        this.manualApprovalRequired = manualApprovalRequired;
    }
}
