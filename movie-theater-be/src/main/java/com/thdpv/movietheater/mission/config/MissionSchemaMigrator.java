package com.thdpv.movietheater.mission.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * @deprecated Mission schema patches are applied by Flyway ({@code R__feature_schema_patches.sql}).
 * Kept for reference; do not call {@link #apply(JdbcTemplate)} in new code.
 */
@Deprecated
public final class MissionSchemaMigrator {

    private static final Logger log = LoggerFactory.getLogger(MissionSchemaMigrator.class);

    private MissionSchemaMigrator() {
    }

    /**
     * @deprecated Use Flyway repeatable migration instead.
     */
    @Deprecated
    public static void apply(JdbcTemplate jdbc) {
        log.debug("MissionSchemaMigrator.apply skipped — handled by Flyway R__feature_schema_patches.sql");
    }
}
