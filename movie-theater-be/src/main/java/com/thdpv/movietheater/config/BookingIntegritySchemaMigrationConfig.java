package com.thdpv.movietheater.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Guarantees the database-level unique indexes that back the double-booking guard actually exist.
 *
 * <p>{@code booking_seat} and {@code seat_locked} both declare a {@code @UniqueConstraint} on
 * {@code (showtime_uuid, seat_uuid)} in their entities, but Hibernate's {@code ddl-auto=update} does
 * <b>not</b> reliably add unique constraints to tables that already exist, and the prod profile runs
 * {@code ddl-auto=validate}, which does not verify unique constraints at all. That means the DB could
 * silently be missing the constraint, letting two confirmed bookings grab the same seat under a race.
 * This migrator creates the indexes idempotently as the last line of defence behind the application
 * locking added elsewhere.
 *
 * <p>{@code booking_seat} has no status column — cancellations delete the row — so a full (unfiltered)
 * unique index correctly models "one live booking per seat per showtime".
 */
@Configuration
public class BookingIntegritySchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(BookingIntegritySchemaMigrationConfig.class);

    @Bean
    BookingIntegritySchemaMigrator bookingIntegritySchemaMigrator(DataSource dataSource) {
        BookingIntegritySchemaMigrator migrator = new BookingIntegritySchemaMigrator(new JdbcTemplate(dataSource));
        migrator.migrate();
        return migrator;
    }

    static final class BookingIntegritySchemaMigrator {

        private final JdbcTemplate jdbc;

        BookingIntegritySchemaMigrator(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        void migrate() {
            log.info("Ensuring booking integrity unique indexes (double-booking guard)...");
            ensureUniqueIndex("booking_seat", "uk_bookingseat_showtime_seat", "showtime_uuid", "seat_uuid");
            ensureUniqueIndex("seat_locked", "uk_seatlocked_showtime_seat", "showtime_uuid", "seat_uuid");
        }

        /**
         * Creates a unique index only when it is safe to do so. If Hibernate already created the
         * matching constraint/index the call is a no-op; if legacy duplicate rows exist we log them
         * loudly and skip creation instead of crashing startup, so the operator can clean up first.
         */
        private void ensureUniqueIndex(String table, String indexName, String colA, String colB) {
            Integer alreadyExists = jdbc.queryForObject(
                    "SELECT count(*) FROM pg_class WHERE relname = ?", Integer.class, indexName);
            if (alreadyExists != null && alreadyExists > 0) {
                log.info("Unique index {} already present on {} — skipping.", indexName, table);
                return;
            }

            Integer duplicateGroups = jdbc.queryForObject(
                    "SELECT count(*) FROM ("
                            + "SELECT " + colA + ", " + colB + " FROM " + table
                            + " GROUP BY " + colA + ", " + colB + " HAVING count(*) > 1) dup",
                    Integer.class);
            if (duplicateGroups != null && duplicateGroups > 0) {
                log.error("Cannot create unique index {} on {}: found {} duplicate ({}, {}) group(s). "
                        + "Resolve the duplicates and restart to enforce the double-booking guard.",
                        indexName, table, duplicateGroups, colA, colB);
                return;
            }

            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS " + indexName
                    + " ON " + table + " (" + colA + ", " + colB + ")");
            log.info("Created unique index {} on {} ({}, {}).", indexName, table, colA, colB);
        }
    }
}
