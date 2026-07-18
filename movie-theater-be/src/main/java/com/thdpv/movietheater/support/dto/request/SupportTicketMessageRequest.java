package com.thdpv.movietheater.support.dto.request;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.Size;

public class SupportTicketMessageRequest {

    @Size(max = 4000)
    private String message;

    private String status;

    @Size(max = 3)
    private List<@Size(max = 1000) String> imageUrls = new ArrayList<>();

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

    public List<String> getImageUrls() {
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls != null ? imageUrls : new ArrayList<>();
    }
}
