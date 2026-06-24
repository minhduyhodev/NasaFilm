package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public class AdminRefundListItemResponse {

    private UUID refundUuid;
    private UUID bookingUuid;
    private BigDecimal amount;
    private String status;
    private String customerEmail;
    private String movieTitle;
    private String createdAt;

    public AdminRefundListItemResponse() {
    }

    public AdminRefundListItemResponse(UUID refundUuid, UUID bookingUuid, BigDecimal amount, String status,
            String customerEmail, String movieTitle, String createdAt) {
        this.refundUuid = refundUuid;
        this.bookingUuid = bookingUuid;
        this.amount = amount;
        this.status = status;
        this.customerEmail = customerEmail;
        this.movieTitle = movieTitle;
        this.createdAt = createdAt;
    }

    public UUID getRefundUuid() {
        return refundUuid;
    }

    public void setRefundUuid(UUID refundUuid) {
        this.refundUuid = refundUuid;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
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

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
