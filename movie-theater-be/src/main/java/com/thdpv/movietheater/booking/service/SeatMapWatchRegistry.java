package com.thdpv.movietheater.booking.service;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class SeatMapWatchRegistry {

    private final ConcurrentHashMap<UUID, Integer> watcherCounts = new ConcurrentHashMap<>();

    public void register(UUID showtimeUuid) {
        if (showtimeUuid == null) {
            return;
        }
        watcherCounts.merge(showtimeUuid, 1, Integer::sum);
    }

    public void unregister(UUID showtimeUuid) {
        if (showtimeUuid == null) {
            return;
        }
        watcherCounts.computeIfPresent(showtimeUuid, (key, count) -> count <= 1 ? null : count - 1);
    }

    public Set<UUID> activeShowtimeUuids() {
        return Set.copyOf(watcherCounts.keySet());
    }
}
