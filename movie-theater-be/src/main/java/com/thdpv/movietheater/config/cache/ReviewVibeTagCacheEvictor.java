package com.thdpv.movietheater.config.cache;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;

@Component
public class ReviewVibeTagCacheEvictor {

    @CacheEvict(value = CacheNames.REVIEW_VIBE_TAG_CATALOG, allEntries = true)
    public void evictCatalog() {
    }
}
