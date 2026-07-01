package com.thdpv.movietheater.movie.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.movie.dto.response.ReviewVibeTagResponse;

@Service
public class ReviewVibeTagCatalogService {

    private final ReviewVibeTagService reviewVibeTagService;

    public ReviewVibeTagCatalogService(ReviewVibeTagService reviewVibeTagService) {
        this.reviewVibeTagService = reviewVibeTagService;
    }

    public List<ReviewVibeTagResponse> listAll() {
        return reviewVibeTagService.listActivePublic();
    }
}
