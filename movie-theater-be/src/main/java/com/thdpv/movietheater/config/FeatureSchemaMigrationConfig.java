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
            log.info("Applying feature schema patches (VOD progress, favorites, notifications, search)...");

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
