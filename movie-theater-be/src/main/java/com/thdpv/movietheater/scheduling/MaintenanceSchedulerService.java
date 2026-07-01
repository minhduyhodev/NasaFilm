package com.thdpv.movietheater.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.booking.service.ShowtimeService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MaintenanceSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceSchedulerService.class);

    private final ShowtimeService showtimeService;
    private final BookingService bookingService;

    @Scheduled(cron = "${app.scheduler.finish-showtimes-cron:0 */5 * * * ?}")
    public void finishExpiredShowtimesScheduled() {
        try {
            int count = showtimeService.finishExpiredShowtimes();
            if (count > 0) {
                log.info("Scheduled maintenance: marked {} expired showtime(s) as FINISHED", count);
            }
        } catch (Exception ex) {
            log.error("Failed to finish expired showtimes", ex);
        }
    }

    @Scheduled(cron = "${app.scheduler.revoke-vod-cron:0 */10 * * * ?}")
    public void revokeExpiredVodTokensScheduled() {
        try {
            int count = bookingService.revokeExpiredVodStreamTokens();
            if (count > 0) {
                log.info("Scheduled maintenance: revoked {} expired VOD stream token(s)", count);
            }
        } catch (Exception ex) {
            log.error("Failed to revoke expired VOD stream tokens", ex);
        }
    }
}
