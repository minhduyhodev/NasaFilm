package com.thdpv.movietheater.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class MovieReviewSchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(MovieReviewSchemaMigrationConfig.class);

    @Bean
    MovieReviewSchemaMigrator movieReviewSchemaMigrator(DataSource dataSource) {
        MovieReviewSchemaMigrator migrator = new MovieReviewSchemaMigrator(new JdbcTemplate(dataSource));
        migrator.migrate();
        return migrator;
    }

    static final class MovieReviewSchemaMigrator {
        private final JdbcTemplate jdbc;

        MovieReviewSchemaMigrator(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        void migrate() {
            log.info("Applying movie review schema patches...");
            jdbc.execute("""
                    ALTER TABLE movie_review
                    DROP CONSTRAINT IF EXISTS uk_movie_review_movie_user
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_movie_review_movie_user
                    ON movie_review (movie_uuid, user_uuid)
                    """);
            log.info("Movie review schema patches applied.");
        }
    }
}
