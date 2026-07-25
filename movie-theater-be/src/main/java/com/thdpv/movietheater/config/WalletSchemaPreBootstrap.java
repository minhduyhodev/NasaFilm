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
        String host = firstNonBlank(System.getProperty("DB_HOST"), "localhost");
        String port = firstNonBlank(System.getProperty("DB_PORT"), "5432");
        String dbName = System.getProperty("DB_NAME");
        String username = System.getProperty("DB_USERNAME");
        String password = System.getProperty("DB_PASSWORD");

        if (isBlank(dbName) || isBlank(username)) {
            log.warn("Skip wallet schema pre-bootstrap: DB_NAME/DB_USERNAME not configured.");
            return;
        }

        String url = "jdbc:postgresql://" + host + ":" + port + "/" + dbName;
        String sslMode = firstNonBlank(System.getProperty("DB_SSL_MODE"), System.getenv("DB_SSL_MODE"));
        if (!isBlank(sslMode)) {
            url += "?sslmode=" + sslMode;
        } else {
            url += "?sslmode=prefer";
        }
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
