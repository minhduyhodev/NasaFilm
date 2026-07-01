package com.thdpv.movietheater.movie.service;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.movie.dto.response.ReviewVibeTagResponse;
import com.thdpv.movietheater.movie.enums.ReviewVibeTag;

@Service
public class ReviewVibeTagCatalogService {

    public List<ReviewVibeTagResponse> listAll() {
        return Arrays.stream(ReviewVibeTag.values())
                .map(tag -> new ReviewVibeTagResponse(tag.getCode(), tag.getLabel(), tag.getHash()))
                .toList();
    }
}
