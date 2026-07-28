package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Fail-fast guard for the production profile — rejects residual mock payment / wallet settings.
 */
@Configuration
@Profile("prod")
public class ProdPaymentSafetyConfig {

    private static final Logger log = LoggerFactory.getLogger(ProdPaymentSafetyConfig.class);
    private static final String MOCK = "mock";

    public ProdPaymentSafetyConfig(
            @Value("${app.payment.provider:stripe}") String paymentProvider,
            @Value("${app.wallet.top-up-provider:stripe}") String walletTopUpProvider) {

        if (MOCK.equalsIgnoreCase(safeTrim(paymentProvider))) {
            throw new IllegalStateException(
                    "app.payment.provider=mock is not allowed under the 'prod' profile. "
                            + "Configure a real payment gateway (e.g. app.payment.provider=stripe).");
        }
        if (MOCK.equalsIgnoreCase(safeTrim(walletTopUpProvider))) {
            throw new IllegalStateException(
                    "app.wallet.top-up-provider=mock is not allowed under the 'prod' profile. "
                            + "Configure a real top-up provider (e.g. app.wallet.top-up-provider=stripe).");
        }

        log.info("Production payment safety check passed (paymentProvider={}, walletTopUpProvider={}).",
                paymentProvider, walletTopUpProvider);
    }

    private static String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}
