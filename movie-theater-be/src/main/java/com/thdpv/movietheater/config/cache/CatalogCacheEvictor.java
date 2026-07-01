package com.thdpv.movietheater.config.cache;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;

@Component
public class CatalogCacheEvictor {

    @CacheEvict(value = { CacheNames.MOVIES, CacheNames.UPCOMING_MOVIES }, allEntries = true)
    public void evictMovieLists() {
        // Evict all movie list caches after catalog mutations.
    }

    @CacheEvict(value = CacheNames.GENRES, allEntries = true)
    public void evictGenres() {
        // Evict genre cache after genre mutations.
    }

    @CacheEvict(value = CacheNames.SYSTEM_CONFIG, allEntries = true)
    public void evictSystemConfig() {
        // Evict system config cache after admin updates.
    }
}
