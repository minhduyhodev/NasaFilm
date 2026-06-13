package com.thdpv.movietheater.user.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UpdateScoreRequest {
    @NotNull(message = "Score khong duoc de trong")
    @Min(value = 0, message = "Score khong duoc nho hon 0")
    private Integer score;

    public UpdateScoreRequest() {
    }

    public UpdateScoreRequest(Integer score) {
        this.score = score;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }
}
