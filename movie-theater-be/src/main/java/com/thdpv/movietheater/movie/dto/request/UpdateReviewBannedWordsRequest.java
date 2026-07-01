package com.thdpv.movietheater.movie.dto.request;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.NotNull;

public class UpdateReviewBannedWordsRequest {

    @NotNull(message = "Danh sach tu cam khong duoc null")
    private List<String> words = new ArrayList<>();

    public UpdateReviewBannedWordsRequest() {
    }

    public List<String> getWords() {
        return words;
    }

    public void setWords(List<String> words) {
        this.words = words;
    }
}
