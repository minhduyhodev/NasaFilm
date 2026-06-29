package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class CreateMovieReviewRequest {

    @Min(value = 1, message = "Diem danh gia toi thieu la 1")
    @Max(value = 5, message = "Diem danh gia toi da la 5")
    private int rating;

    @Size(max = 2000, message = "Binh luan khong duoc vuot qua 2000 ky tu")
    private String comment;

    public CreateMovieReviewRequest() {
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
