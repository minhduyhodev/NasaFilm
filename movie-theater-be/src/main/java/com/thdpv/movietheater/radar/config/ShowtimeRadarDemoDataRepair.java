package com.thdpv.movietheater.radar.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.showtime-radar.repair-demo-showtimes", havingValue = "true")
public class ShowtimeRadarDemoDataRepair {

    private static final Logger log = LoggerFactory.getLogger(ShowtimeRadarDemoDataRepair.class);

    private final JdbcTemplate jdbcTemplate;

    public ShowtimeRadarDemoDataRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void repairExpiredShowtimesWhenRadarWindowIsEmpty() {
        Integer upcoming = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM showtime
                WHERE status IN ('OPEN_FOR_BOOKING', 'SCHEDULED')
                  AND start_time > NOW()
                  AND start_time < NOW() + INTERVAL '48 hours'
                """, Integer.class);

        if (upcoming != null && upcoming > 0) {
            return;
        }

        int repaired = jdbcTemplate.update("""
                UPDATE showtime
                SET start_time = start_time
                    + (CEIL(EXTRACT(EPOCH FROM ((NOW() + INTERVAL '1 day') - start_time)) / 86400.0) * INTERVAL '1 day'),
                    end_time = end_time
                    + (CEIL(EXTRACT(EPOCH FROM ((NOW() + INTERVAL '1 day') - start_time)) / 86400.0) * INTERVAL '1 day'),
                    status = 'OPEN_FOR_BOOKING'
                WHERE start_time < NOW()
                  AND start_time > NOW() - INTERVAL '90 days'
                """);

        if (repaired > 0) {
            log.info("Showtime Radar demo repair rolled {} expired showtime(s) into the future", repaired);
        }
    }
}
