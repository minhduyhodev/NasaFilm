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
            ensureTextColumn("movie_review", "comment");
            ensureTextColumn("movie_review", "moderation_note");
            jdbc.execute("""
                    ALTER TABLE movie_review
                    ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'VISIBLE'
                    """);
            jdbc.execute("""
                    ALTER TABLE movie_review
                    ADD COLUMN IF NOT EXISTS moderated_by_uuid uuid
                    """);
            jdbc.execute("""
                    ALTER TABLE movie_review
                    ADD COLUMN IF NOT EXISTS moderated_at timestamptz
                    """);
            jdbc.execute("""
                    ALTER TABLE movie_review
                    ADD COLUMN IF NOT EXISTS moderation_note text
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS movie_review_report (
                        uuid uuid PRIMARY KEY,
                        review_uuid uuid NOT NULL,
                        reporter_uuid uuid NOT NULL,
                        reason text NOT NULL,
                        status varchar(20) NOT NULL DEFAULT 'PENDING',
                        resolved_by_uuid uuid,
                        resolved_at timestamptz,
                        resolution_note text,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_movie_review_report_review_reporter
                            UNIQUE (review_uuid, reporter_uuid)
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_movie_review_report_status
                    ON movie_review_report (status)
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_movie_review_report_review
                    ON movie_review_report (review_uuid)
                    """);
            log.info("Movie review schema patches applied.");
        }

        private void ensureTextColumn(String table, String column) {
            String dataType = jdbc.query(
                    """
                            select data_type
                            from information_schema.columns
                            where table_schema = 'public'
                              and table_name = ?
                              and column_name = ?
                            """,
                    rs -> rs.next() ? rs.getString(1) : null,
                    table,
                    column);
            if (dataType == null) {
                return;
            }
            if ("bytea".equalsIgnoreCase(dataType)) {
                log.info("Converting {}.{} from bytea to text", table, column);
                jdbc.execute(String.format(
                        """
                                ALTER TABLE %s
                                ALTER COLUMN %s TYPE text
                                USING convert_from(%s, 'UTF8')
                                """,
                        table, column, column));
                return;
            }
            if (!"text".equalsIgnoreCase(dataType) && !"character varying".equalsIgnoreCase(dataType)) {
                log.info("Converting {}.{} from {} to text", table, column, dataType);
                jdbc.execute(String.format(
                        """
                                ALTER TABLE %s
                                ALTER COLUMN %s TYPE text
                                USING %s::text
                                """,
                        table, column, column));
            }
        }
    }
}
