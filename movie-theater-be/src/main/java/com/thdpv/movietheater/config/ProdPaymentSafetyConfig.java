package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Fail-fast guard for the production profile.
 *
 * <p>The production profile must never run with mock payment or wallet providers. A mock gateway
 * could mark charges successful or credit wallet balance without collecting real money, so the
 * application refuses to start until real providers are configured.
 *
 * <p>Only active under the {@code prod} profile; dev/demo runs are unaffected.
 */
@Configuration
@Profile("prod")
public class ProdPaymentSafetyConfig {

    private static final Logger log = LoggerFactory.getLogger(ProdPaymentSafetyConfig.class);
    private static final String MOCK = "mock";

    public ProdPaymentSafetyConfig(
            @Value("${app.payment.provider:mock}") String paymentProvider,
            @Value("${app.wallet.top-up-provider:mock}") String walletTopUpProvider,
            @Value("${app.wallet.seed-demo-balance:false}") boolean seedDemoBalance) {

        if (MOCK.equalsIgnoreCase(safeTrim(paymentProvider))) {
            throw new IllegalStateException(
                    "app.payment.provider=mock is not allowed under the 'prod' profile. "
                            + "Configure a real payment gateway (e.g. app.payment.provider=stripe) before deploying.");
        }
        if (MOCK.equalsIgnoreCase(safeTrim(walletTopUpProvider))) {
            throw new IllegalStateException(
                    "app.wallet.top-up-provider=mock is not allowed under the 'prod' profile. "
                            + "Configure a real top-up provider (e.g. app.wallet.top-up-provider=stripe) before deploying.");
        }
        if (seedDemoBalance) {
            throw new IllegalStateException(
                    "app.wallet.seed-demo-balance=true is not allowed under the 'prod' profile — "
                            + "it grants free wallet balance to users.");
        }

        log.info("Production payment safety check passed (paymentProvider={}, walletTopUpProvider={}).",
                paymentProvider, walletTopUpProvider);
    }

    private static String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}
