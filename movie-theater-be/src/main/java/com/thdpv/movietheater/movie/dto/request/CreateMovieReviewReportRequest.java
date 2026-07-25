package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateMovieReviewReportRequest {

    @NotBlank(message = "Ly do bao cao khong duoc de trong")
    @Size(max = 1000, message = "Ly do bao cao toi da 1000 ky tu")
    private String reason;

    public CreateMovieReviewReportRequest() {
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
