package com.thdpv.movietheater.config.cache;

import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;

@Component
public class MovieReviewCacheEvictor {

    private final CatalogCacheEvictor catalogCacheEvictor;
    private final ReviewVibeTagCacheEvictor reviewVibeTagCacheEvictor;

    public MovieReviewCacheEvictor(
            CatalogCacheEvictor catalogCacheEvictor,
            ReviewVibeTagCacheEvictor reviewVibeTagCacheEvictor) {
        this.catalogCacheEvictor = catalogCacheEvictor;
        this.reviewVibeTagCacheEvictor = reviewVibeTagCacheEvictor;
    }

    @CacheEvict(
            value = { CacheNames.MOVIE_REVIEW_SUMMARY, CacheNames.MOVIE_REVIEW_VIBE_STATS },
            key = "#movieUuid")
    public void evictSummary(UUID movieUuid) {
        catalogCacheEvictor.evictMovieLists();
        reviewVibeTagCacheEvictor.evictCatalog();
    }
}
