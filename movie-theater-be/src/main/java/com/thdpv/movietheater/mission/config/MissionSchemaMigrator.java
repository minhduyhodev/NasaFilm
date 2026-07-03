package com.thdpv.movietheater.mission.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Idempotent JDBC patches for mission long-term schema.
 * Reference SQL: {@code classpath:db/mission/V1__mission_long_term.sql}
 */
public final class MissionSchemaMigrator {

    private static final Logger log = LoggerFactory.getLogger(MissionSchemaMigrator.class);

    private MissionSchemaMigrator() {
    }

    public static void apply(JdbcTemplate jdbc) {
        log.info("Applying mission long-term schema patches...");
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS mission_campaign (
                    uuid uuid PRIMARY KEY,
                    code varchar(64) NOT NULL,
                    title varchar(255) NOT NULL,
                    description text,
                    status varchar(32) NOT NULL DEFAULT 'DRAFT',
                    starts_at timestamptz,
                    ends_at timestamptz,
                    sort_order integer NOT NULL DEFAULT 0,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now(),
                    CONSTRAINT uk_mission_campaign_code UNIQUE (code)
                )
                """);

        jdbc.execute("ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS recurrence varchar(32)");
        jdbc.execute("UPDATE mission_template SET recurrence = 'ONCE' WHERE recurrence IS NULL");
        jdbc.execute("ALTER TABLE mission_template ALTER COLUMN recurrence SET DEFAULT 'ONCE'");
        jdbc.execute("ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS campaign_uuid uuid");
        jdbc.execute("ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS starts_at timestamptz");
        jdbc.execute("ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS ends_at timestamptz");

        jdbc.execute("ALTER TABLE user_mission ADD COLUMN IF NOT EXISTS cycle_key varchar(32)");
        jdbc.execute("UPDATE user_mission SET cycle_key = 'ONCE' WHERE cycle_key IS NULL");
        jdbc.execute("ALTER TABLE user_mission ALTER COLUMN cycle_key SET DEFAULT 'ONCE'");
        jdbc.execute("ALTER TABLE user_mission DROP CONSTRAINT IF EXISTS uk_user_mission_user_template");
        jdbc.execute("""
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uk_user_mission_user_template_cycle'
                    ) THEN
                        ALTER TABLE user_mission ADD CONSTRAINT uk_user_mission_user_template_cycle
                            UNIQUE (user_uuid, mission_template_uuid, cycle_key);
                    END IF;
                END $$
                """);

        jdbc.execute("ALTER TABLE mission_progress_event ADD COLUMN IF NOT EXISTS cycle_key varchar(32)");
        jdbc.execute("UPDATE mission_progress_event SET cycle_key = 'ONCE' WHERE cycle_key IS NULL");
        jdbc.execute("ALTER TABLE mission_progress_event ALTER COLUMN cycle_key SET DEFAULT 'ONCE'");
        jdbc.execute("ALTER TABLE mission_progress_event DROP CONSTRAINT IF EXISTS uk_mission_progress_event");
        jdbc.execute("""
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uk_mission_progress_event'
                    ) THEN
                        ALTER TABLE mission_progress_event ADD CONSTRAINT uk_mission_progress_event
                            UNIQUE (user_uuid, mission_template_uuid, cycle_key, source_type, source_id);
                    END IF;
                END $$
                """);
        jdbc.execute(
                "UPDATE mission_template SET recurrence = 'MONTHLY' WHERE code = 'EXPLORER' AND recurrence = 'ONCE'");
        jdbc.execute("ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS deleted_at timestamptz");
    }
}
