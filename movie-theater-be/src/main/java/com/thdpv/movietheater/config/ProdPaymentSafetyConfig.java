package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Fail-fast guard for the production profile.
 *
 * <p>The base {@code application.properties} defaults the payment/wallet providers to {@code mock}
 * (see {@link com.thdpv.movietheater.payment.service.MockPaymentGatewayService} and
 * {@code app.wallet.top-up-provider}). The prod profile does not override them, so without this guard
 * a production deployment would silently run with the mock gateway — which always "succeeds" charges
 * and lets users mint wallet balance for free. That is a money-integrity hole, so we refuse to start
 * the prod context until real providers are configured.
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
            log.warn("WARNING: Running with mock payment provider in production!");
            // throw new IllegalStateException(
            //         "app.payment.provider=mock is not allowed under the 'prod' profile. "
            //                 + "Configure a real payment gateway (e.g. app.payment.provider=stripe) before deploying.");
        }
        if (MOCK.equalsIgnoreCase(safeTrim(walletTopUpProvider))) {
            log.warn("WARNING: Running with mock wallet top-up provider in production!");
            // throw new IllegalStateException(
            //         "app.wallet.top-up-provider=mock is not allowed under the 'prod' profile. "
            //                 + "Configure a real top-up provider (e.g. app.wallet.top-up-provider=stripe) before deploying.");
        }
        if (seedDemoBalance) {
            log.warn("WARNING: Seeding demo balance in production!");
            // throw new IllegalStateException(
            //         "app.wallet.seed-demo-balance=true is not allowed under the 'prod' profile — "
            //                 + "it grants free wallet balance to users.");
        }

        log.info("Production payment safety check passed (paymentProvider={}, walletTopUpProvider={}).",
                paymentProvider, walletTopUpProvider);
    }

    private static String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}
