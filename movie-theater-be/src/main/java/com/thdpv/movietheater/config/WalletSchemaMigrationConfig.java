package com.thdpv.movietheater.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class WalletSchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(WalletSchemaMigrationConfig.class);

    @Bean
    WalletSchemaMigrator walletSchemaMigrator(DataSource dataSource) {
        WalletSchemaMigrator migrator = new WalletSchemaMigrator(new JdbcTemplate(dataSource));
        migrator.migrate();
        return migrator;
    }

    static final class WalletSchemaMigrator {
        private final JdbcTemplate jdbc;

        WalletSchemaMigrator(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        void migrate() {
            log.info("Applying wallet schema patches...");
            jdbc.execute("""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0
                    """);
            jdbc.execute("""
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
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transaction (user_uuid)
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transaction (created_at)
                    """);
            log.info("Wallet schema patches applied.");
        }
    }
}
