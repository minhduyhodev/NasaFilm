package com.thdpv.movietheater.booking.dto.request;

import jakarta.validation.constraints.Size;

public class CancelBookingRequest {

    @Size(max = 500)
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
