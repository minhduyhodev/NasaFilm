package com.thdpv.movietheater.support.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SupportTicketCreateRequest {

    @NotBlank
    @Size(max = 80)
    private String category;

    @NotBlank
    @Size(max = 4000)
    private String description;

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
