package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ResolveMovieReviewReportRequest {

    @NotBlank(message = "Hanh dong xu ly khong duoc de trong")
    @Pattern(regexp = "HIDE_REVIEW|DISMISS", message = "Hanh dong khong hop le")
    private String action;

    @Size(max = 1000, message = "Ghi chu toi da 1000 ky tu")
    private String note;

    public ResolveMovieReviewReportRequest() {
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
