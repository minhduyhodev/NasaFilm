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
            log.info("Applying feature schema patches (VOD progress, favorites, notifications, search, review vibe tags)...");

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

            ensureSearchVector("movie", "title", "description");
            ensureSearchVector("cinema", "name", "address");
            ensureSearchVector("actor", "full_name", null);
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
