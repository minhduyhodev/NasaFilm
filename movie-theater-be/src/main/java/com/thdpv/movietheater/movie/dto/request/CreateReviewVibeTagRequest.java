package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CreateReviewVibeTagRequest {

    @NotBlank(message = "Ma tag khong duoc de trong")
    @Size(max = 64)
    @Pattern(regexp = "^[a-z0-9_]+$", message = "Ma tag chi gom chu thuong, so va dau gach duoi")
    private String code;

    @NotBlank(message = "Nhan tag khong duoc de trong")
    @Size(max = 120)
    private String label;

    @NotBlank(message = "Hash hien thi khong duoc de trong")
    @Size(max = 120)
    private String hash;

    private int displayOrder;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

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

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
