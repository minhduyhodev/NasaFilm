package com.thdpv.movietheater.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Runs wallet DDL before Spring/JPA starts so existing databases pick up new columns.
 */
public final class WalletSchemaPreBootstrap {

    private static final Logger log = LoggerFactory.getLogger(WalletSchemaPreBootstrap.class);

    private WalletSchemaPreBootstrap() {
    }

    public static void apply() {
        String url = firstNonBlank(System.getProperty("SPRING_DATASOURCE_URL"), System.getenv("SPRING_DATASOURCE_URL"));
        String username = firstNonBlank(System.getProperty("SPRING_DATASOURCE_USERNAME"), System.getenv("SPRING_DATASOURCE_USERNAME"));
        String password = firstNonBlank(System.getProperty("SPRING_DATASOURCE_PASSWORD"), System.getenv("SPRING_DATASOURCE_PASSWORD"));

        if (isBlank(url)) {
            String host = firstNonBlank(firstNonBlank(System.getProperty("DB_HOST"), System.getenv("DB_HOST")), "localhost");
            String port = firstNonBlank(firstNonBlank(System.getProperty("DB_PORT"), System.getenv("DB_PORT")), "5432");
            String dbName = firstNonBlank(System.getProperty("DB_NAME"), System.getenv("DB_NAME"));
            if (isBlank(dbName)) {
                log.warn("Skip wallet schema pre-bootstrap: database connection URL or DB_NAME not configured.");
                return;
            }
            url = "jdbc:postgresql://" + host + ":" + port + "/" + dbName;
        }

        if (isBlank(username)) {
            username = firstNonBlank(System.getProperty("DB_USERNAME"), System.getenv("DB_USERNAME"));
        }

        if (isBlank(username)) {
            log.warn("Skip wallet schema pre-bootstrap: database username not configured.");
            return;
        }

        if (isBlank(password)) {
            password = firstNonBlank(System.getProperty("DB_PASSWORD"), System.getenv("DB_PASSWORD"));
        }

        log.info("Wallet pre-bootstrap connecting to: url={}, username={}", url, username);
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            log.warn("Skip wallet schema pre-bootstrap: PostgreSQL driver not on classpath yet.");
            return;
        }

        try (Connection conn = DriverManager.getConnection(url, username, password);
                Statement st = conn.createStatement()) {
            st.execute("""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0
                    """);
            st.execute("""
                    CREATE TABLE IF NOT EXISTS wallet_transaction (
                        uuid UUID PRIMARY KEY,
                        user_uuid UUID NOT NULL,
                        type VARCHAR(32) NOT NULL,
                        amount NUMERIC(15, 2) NOT NULL,
                        balance_after NUMERIC(15, 2) NOT NULL,
                        reference_uuid UUID,
                        description VARCHAR(512),
                        created_at TIMESTAMPTZ NOT NULL
                    )
                    """);
            st.execute("CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transaction (user_uuid)");
            st.execute("CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transaction (created_at)");
            log.info("Wallet schema pre-bootstrap completed.");
        } catch (Exception e) {
            log.warn("Wallet schema pre-bootstrap failed: {}", e.getMessage());
        }
    }

    private static String firstNonBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
