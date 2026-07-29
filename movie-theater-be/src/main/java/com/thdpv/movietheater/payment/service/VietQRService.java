package com.thdpv.movietheater.payment.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.payment.dto.SePayWebhookPayload;
import com.thdpv.movietheater.payment.dto.VietQRGenerateResponse;
import com.thdpv.movietheater.payment.entity.VietQRWebhookTransaction;
import com.thdpv.movietheater.payment.repository.VietQRWebhookTransactionRepository;

import jakarta.annotation.PostConstruct;

/**
 * Generates VietQR Quick Link URLs for bank transfer QR codes.
 * Uses the free VietQR image service (https://img.vietqr.io) — no API key
 * required.
 *
 * Format: https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-{TEMPLATE}.png
 * ?amount={AMOUNT}&addInfo={CONTENT}&accountName={NAME}
 */
@Service
public class VietQRService {

    private static final String VIETQR_BASE_URL = "https://img.vietqr.io/image";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Pattern TRANSFER_CODE_PATTERN = Pattern.compile("(?i)\\b(NF[A-Z0-9]{6,14})\\b");
    private static final Logger log = LoggerFactory.getLogger(VietQRService.class);

    @Value("${app.vietqr.bank-bin:970422}")
    private String bankBin;

    @Value("${app.vietqr.account-no:6102005112233}")
    private String accountNo;

    @Value("${app.vietqr.account-name:HO MINH DUY}")
    private String accountName;

    @Value("${app.vietqr.bank-name:MB Bank}")
    private String bankName;

    @Value("${app.vietqr.template:compact2}")
    private String template;

    @Value("${app.vietqr.bank-logo:https://img.vietqr.io/img/MB.png}")
    private String bankLogo;

    @Value("${app.vietqr.webhook-token:}")
    private String webhookToken;

    /**
     * When true (default), webhooks are rejected unless a token is configured and matches.
     * Set false only for local/dev without a SePay secret.
     */
    @Value("${app.vietqr.webhook-require-token:true}")
    private boolean webhookRequireToken;

    private final VietQRWebhookTransactionRepository webhookRepo;

    public VietQRService(VietQRWebhookTransactionRepository webhookRepo) {
        this.webhookRepo = webhookRepo;
    }

    @PostConstruct
    void warnIfWebhookTokenMissing() {
        boolean tokenConfigured = webhookToken != null && !webhookToken.isBlank();
        if (webhookRequireToken && !tokenConfigured) {
            log.error("VietQR webhook-require-token=true nhưng VIETQR_WEBHOOK_TOKEN trống — "
                    + "mọi webhook sẽ bị từ chối. Đặt token trước khi nhận chuyển khoản.");
        }
    }

    /**
     * Generates a VietQR image URL and bank transfer details for a given amount.
     *
     * @param amount      amount in VND
     * @param description optional description for transfer content (e.g., booking
     *                    code)
     * @return response with QR image URL and transfer details
     */
    public VietQRGenerateResponse generateQR(long amount, String description) {
        String transferCode = generateUniqueCode();
        String transferContent = "NASAFILM " + transferCode;
        String qrImageUrl = buildQrImageUrl(amount, transferContent);

        return new VietQRGenerateResponse(
                qrImageUrl,
                bankName,
                bankLogo,
                accountNo,
                accountName,
                amount,
                transferContent,
                transferCode);
    }

    private String generateUniqueCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
        }
        return "NF" + sb;
    }

    private String buildQrImageUrl(long amount, String transferContent) {
        StringBuilder url = new StringBuilder();
        url.append(VIETQR_BASE_URL)
                .append("/").append(bankBin)
                .append("-").append(accountNo)
                .append("-").append(template)
                .append(".png");

        url.append("?amount=").append(amount);
        url.append("&addInfo=").append(urlEncode(transferContent));
        url.append("&accountName=").append(urlEncode(accountName));

        return url.toString();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public boolean processWebhook(SePayWebhookPayload payload, String authHeader) {
        assertWebhookAuthorized(authHeader);

        if (webhookRepo.existsByReferenceCode(payload.getReferenceCode())) {
            log.info("Transaction {} already processed", payload.getReferenceCode());
            return false;
        }

        VietQRWebhookTransaction tx = new VietQRWebhookTransaction();
        tx.setReferenceCode(payload.getReferenceCode());
        BigDecimal finalAmount = payload.getTransferAmount() != null ? payload.getTransferAmount()
                : payload.getAmount();
        tx.setAmount(finalAmount);
        tx.setTransferContent(payload.getContent());
        tx.setTransferCode(extractTransferCode(payload.getContent()));
        tx.setSubAccount(payload.getSubAccount());
        tx.setGateway(payload.getGateway());
        tx.setTransactionDate(OffsetDateTime.now());
        tx.setStatus("UNUSED");
        webhookRepo.save(tx);

        log.info("Saved new VietQR transaction: {} code={}", payload.getReferenceCode(), tx.getTransferCode());
        return true;
    }

    /** Pulls NF… code from free-text bank transfer content. */
    static String extractTransferCode(String transferContent) {
        if (transferContent == null || transferContent.isBlank()) {
            return null;
        }
        Matcher matcher = TRANSFER_CODE_PATTERN.matcher(transferContent);
        if (matcher.find()) {
            return matcher.group(1).toUpperCase();
        }
        return null;
    }

    private void assertWebhookAuthorized(String authHeader) {
        boolean tokenConfigured = webhookToken != null && !webhookToken.isBlank();
        if (!tokenConfigured) {
            if (webhookRequireToken) {
                log.error("VietQR webhook token is required but not configured — rejecting unauthenticated webhook");
                throw new AppException(ErrorCode.UNAUTHORIZED, "Webhook VietQR chưa được cấu hình token");
            }
            return;
        }
        if (!tokenMatches(authHeader, webhookToken.trim())) {
            log.warn("Invalid VietQR webhook token received");
            throw new AppException(ErrorCode.UNAUTHORIZED, "Webhook VietQR không hợp lệ");
        }
    }

    /**
     * Accepts raw token, {@code Bearer <token>}, or {@code Apikey <token>}. Uses constant-time compare.
     */
    static boolean tokenMatches(String authHeader, String expectedToken) {
        if (authHeader == null || authHeader.isBlank() || expectedToken == null || expectedToken.isBlank()) {
            return false;
        }
        String presented = authHeader.trim();
        if (presented.regionMatches(true, 0, "Bearer ", 0, 7)) {
            presented = presented.substring(7).trim();
        } else if (presented.regionMatches(true, 0, "Apikey ", 0, 7)) {
            presented = presented.substring(7).trim();
        }
        return constantTimeEquals(presented, expectedToken);
    }

    private static boolean constantTimeEquals(String a, String b) {
        byte[] left = a.getBytes(StandardCharsets.UTF_8);
        byte[] right = b.getBytes(StandardCharsets.UTF_8);
        if (left.length != right.length) {
            MessageDigest.isEqual(left, left);
            return false;
        }
        return MessageDigest.isEqual(left, right);
    }

    public boolean checkPaymentStatus(String code, BigDecimal amount) {
        if (code == null || code.isBlank() || amount == null) {
            return false;
        }
        String normalized = code.trim().toUpperCase();
        if (!normalized.matches("^[A-Z0-9]{6,16}$")) {
            return false;
        }
        List<VietQRWebhookTransaction> txs = webhookRepo.findMatchingUnusedTransaction(normalized, amount);
        return !txs.isEmpty();
    }
}
