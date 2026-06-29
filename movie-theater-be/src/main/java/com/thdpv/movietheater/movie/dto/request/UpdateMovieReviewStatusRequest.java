package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateMovieReviewStatusRequest {

    @NotBlank(message = "Trang thai khong duoc de trong")
    @Pattern(regexp = "VISIBLE|HIDDEN", message = "Trang thai khong hop le")
    private String status;

    @Size(max = 1000, message = "Ghi chu toi da 1000 ky tu")
    private String note;

    public UpdateMovieReviewStatusRequest() {
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
