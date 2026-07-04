package com.thdpv.movietheater.support.dto.request;

import jakarta.validation.constraints.NotBlank;

public class SupportTicketMessageRequest {

    @NotBlank
    private String message;

    private String status;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
