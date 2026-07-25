package com.thdpv.movietheater.movie.dto.request;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class CreateMovieReviewRequest {

    @Min(value = 1, message = "Diem danh gia toi thieu la 1")
    @Max(value = 5, message = "Diem danh gia toi da la 5")
    private int rating;

    @Size(max = 2000, message = "Binh luan khong duoc vuot qua 2000 ky tu")
    private String comment;

    @Size(max = 3, message = "Chi duoc chon toi da 3 vibe tag")
    private List<String> vibeTags = new ArrayList<>();

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

    public List<String> getVibeTags() {
        return vibeTags;
    }

    public void setVibeTags(List<String> vibeTags) {
        this.vibeTags = vibeTags;
    }
}
