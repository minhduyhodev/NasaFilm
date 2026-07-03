package com.thdpv.movietheater.mission.dto.request;

import jakarta.validation.constraints.NotBlank;

public class DuplicateMissionTemplateRequest {

    @NotBlank
    private String newCode;

    public String getNewCode() {
        return newCode;
    }

    public void setNewCode(String newCode) {
        this.newCode = newCode;
    }
}
