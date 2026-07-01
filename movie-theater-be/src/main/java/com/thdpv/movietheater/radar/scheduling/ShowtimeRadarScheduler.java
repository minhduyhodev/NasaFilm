package com.thdpv.movietheater.radar.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.radar.service.ShowtimeRadarService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ShowtimeRadarScheduler {

    private static final Logger log = LoggerFactory.getLogger(ShowtimeRadarScheduler.class);

    private final ShowtimeRadarService showtimeRadarService;

    @Scheduled(cron = "${app.scheduler.showtime-radar-cron:0 0 */6 * * ?}")
    public void scanShowtimeRadarScheduled() {
        try {
            showtimeRadarService.scanAndNotifyAll();
        } catch (Exception ex) {
            log.error("Showtime Radar scheduler failed", ex);
        }
    }
}
