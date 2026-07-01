package com.thdpv.movietheater.scheduling;

import java.util.Set;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.booking.service.SeatMapEventPublisher;
import com.thdpv.movietheater.booking.service.SeatMapWatchRegistry;

@Component
public class SeatMapWatchScheduler {

    private final SeatMapWatchRegistry seatMapWatchRegistry;
    private final SeatMapEventPublisher seatMapEventPublisher;

    public SeatMapWatchScheduler(
            SeatMapWatchRegistry seatMapWatchRegistry,
            SeatMapEventPublisher seatMapEventPublisher) {
        this.seatMapWatchRegistry = seatMapWatchRegistry;
        this.seatMapEventPublisher = seatMapEventPublisher;
    }

    @Scheduled(fixedDelayString = "${app.seat-map.watch-push-ms:5000}")
    public void broadcastWatchedSeatMaps() {
        Set<UUID> showtimeUuids = seatMapWatchRegistry.activeShowtimeUuids();
        if (showtimeUuids.isEmpty()) {
            return;
        }
        for (UUID showtimeUuid : showtimeUuids) {
            seatMapEventPublisher.notifySeatMapUpdated(showtimeUuid);
        }
    }
}
