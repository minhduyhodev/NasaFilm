package com.thdpv.movietheater.config.cache;

import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;

@Component
public class MovieReviewCacheEvictor {

    @CacheEvict(value = CacheNames.MOVIE_REVIEW_SUMMARY, key = "#movieUuid")
    public void evictSummary(UUID movieUuid) {
    }
}
