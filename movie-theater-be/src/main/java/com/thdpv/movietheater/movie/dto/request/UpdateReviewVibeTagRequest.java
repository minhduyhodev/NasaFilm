package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateReviewVibeTagRequest {

    @NotBlank(message = "Nhan tag khong duoc de trong")
    @Size(max = 120)
    private String label;

    @NotBlank(message = "Hash hien thi khong duoc de trong")
    @Size(max = 120)
    private String hash;

    private boolean active = true;

    private int displayOrder;

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
