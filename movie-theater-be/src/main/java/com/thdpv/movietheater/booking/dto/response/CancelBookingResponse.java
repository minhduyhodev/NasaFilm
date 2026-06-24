package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public class CancelBookingResponse {

    private UUID bookingUuid;
    private String bookingStatus;
    private UUID cancellationRequestUuid;
    private UUID refundUuid;
    private BigDecimal refundAmount;
    private BigDecimal cancellationFee;
    private String message;

    public CancelBookingResponse() {
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
