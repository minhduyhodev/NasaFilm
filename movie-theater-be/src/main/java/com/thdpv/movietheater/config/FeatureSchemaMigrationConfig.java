package com.thdpv.movietheater.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class FeatureSchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(FeatureSchemaMigrationConfig.class);

    @Bean
    FeatureSchemaMigrator featureSchemaMigrator(DataSource dataSource) {
        FeatureSchemaMigrator migrator = new FeatureSchemaMigrator(new JdbcTemplate(dataSource));
        migrator.migrate();
        return migrator;
    }

    static final class FeatureSchemaMigrator {
        private final JdbcTemplate jdbc;

        FeatureSchemaMigrator(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        void migrate() {
            log.info("Applying feature schema patches (VOD progress, favorites, notifications, search, review vibe tags, missions)...");

            jdbc.execute("""
                    ALTER TABLE movie_review
                    ADD COLUMN IF NOT EXISTS vibe_tags text
                    """);
            jdbc.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'movie_review'
                              AND column_name = 'vibe_tags'
                              AND udt_name = 'text'
                        ) THEN
                            ALTER TABLE movie_review
                            ALTER COLUMN vibe_tags TYPE jsonb
                            USING CASE
                                WHEN vibe_tags IS NULL OR btrim(vibe_tags) = '' THEN NULL
                                ELSE vibe_tags::jsonb
                            END;
                        END IF;
                    END $$
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_movie_review_vibe_tags
                    ON movie_review USING GIN (vibe_tags)
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_movie_review_visible_tagged
                    ON movie_review (movie_uuid)
                    WHERE status = 'VISIBLE'
                      AND vibe_tags IS NOT NULL
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS review_vibe_tag (
                        uuid uuid PRIMARY KEY,
                        code varchar(64) NOT NULL,
                        label varchar(120) NOT NULL,
                        hash varchar(120) NOT NULL,
                        active boolean NOT NULL DEFAULT true,
                        display_order integer NOT NULL DEFAULT 0,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_review_vibe_tag_code UNIQUE (code)
                    )
                    """);

            jdbc.execute("""
                    ALTER TABLE booking
                    ADD COLUMN IF NOT EXISTS vod_position_seconds integer
                    """);
            jdbc.execute("""
                    ALTER TABLE booking
                    ADD COLUMN IF NOT EXISTS vod_duration_seconds integer
                    """);
            jdbc.execute("""
                    ALTER TABLE booking
                    ADD COLUMN IF NOT EXISTS vod_last_watched_at timestamptz
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS user_favorite (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        movie_uuid uuid NOT NULL,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_user_favorite_user_movie UNIQUE (user_uuid, movie_uuid)
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_favorite_user
                    ON user_favorite (user_uuid, created_at DESC)
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS user_notification (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        title varchar(255) NOT NULL,
                        content text,
                        type varchar(32) NOT NULL DEFAULT 'info',
                        read_at timestamptz,
                        created_at timestamptz NOT NULL DEFAULT now()
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_notification_user_created
                    ON user_notification (user_uuid, created_at DESC)
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS push_subscription (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        endpoint text NOT NULL,
                        p256dh text NOT NULL,
                        auth text NOT NULL,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_push_subscription_endpoint UNIQUE (endpoint)
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS mission_template (
                        uuid uuid PRIMARY KEY,
                        code varchar(64) NOT NULL,
                        version integer NOT NULL DEFAULT 1,
                        title varchar(255) NOT NULL,
                        description text,
                        condition_type varchar(64) NOT NULL,
                        condition_json jsonb,
                        reward_points integer NOT NULL DEFAULT 0,
                        reward_badge_code varchar(64),
                        reward_badge_title varchar(120),
                        requires_feature varchar(64),
                        target_value integer NOT NULL DEFAULT 1,
                        is_active boolean NOT NULL DEFAULT true,
                        sort_order integer NOT NULL DEFAULT 0,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_mission_template_code UNIQUE (code)
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS user_mission (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        mission_template_uuid uuid NOT NULL,
                        template_version integer NOT NULL DEFAULT 1,
                        status varchar(32) NOT NULL,
                        progress_current integer NOT NULL DEFAULT 0,
                        progress_target integer NOT NULL DEFAULT 1,
                        progress_json jsonb,
                        completed_at timestamptz,
                        enrolled_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_user_mission_user_template UNIQUE (user_uuid, mission_template_uuid)
                    )
                    """);

            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_mission_user
                    ON user_mission (user_uuid, updated_at DESC)
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS mission_progress_event (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        mission_template_uuid uuid NOT NULL,
                        source_type varchar(64) NOT NULL,
                        source_id varchar(64) NOT NULL,
                        event_at timestamptz NOT NULL,
                        CONSTRAINT uk_mission_progress_event UNIQUE (
                            user_uuid, mission_template_uuid, source_type, source_id
                        )
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS user_badge (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        badge_code varchar(64) NOT NULL,
                        badge_title varchar(120) NOT NULL,
                        source_user_mission_uuid uuid,
                        unlocked_at timestamptz NOT NULL,
                        CONSTRAINT uk_user_badge_user_code UNIQUE (user_uuid, badge_code)
                    )
                    """);

            ensureMissionLongTermSchema();

            ensureSearchVector("movie", "title", null);
            ensureSearchVector("cinema", "name", "address");
            ensureSearchVector("actor", "full_name", null);
        }

        private void ensureMissionLongTermSchema() {
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
            jdbc.execute("UPDATE mission_template SET recurrence = 'MONTHLY' WHERE code = 'EXPLORER' AND recurrence = 'ONCE'");
        }

        private void ensureSearchVector(String table, String primaryCol, String secondaryCol) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS search_vector tsvector");
            String expr = secondaryCol == null
                    ? "coalesce(" + primaryCol + ", '')"
                    : "coalesce(" + primaryCol + ", '') || ' ' || coalesce(" + secondaryCol + ", '')";
            jdbc.execute("UPDATE " + table + " SET search_vector = to_tsvector('simple', " + expr + ") WHERE search_vector IS NULL");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_" + table + "_search ON " + table + " USING GIN(search_vector)");
        }
    }
}
