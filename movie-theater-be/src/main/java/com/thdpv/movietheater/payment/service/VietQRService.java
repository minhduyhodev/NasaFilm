package com.thdpv.movietheater.payment.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.payment.dto.SePayWebhookPayload;
import com.thdpv.movietheater.payment.dto.VietQRGenerateResponse;
import com.thdpv.movietheater.payment.entity.VietQRWebhookTransaction;
import com.thdpv.movietheater.payment.repository.VietQRWebhookTransactionRepository;

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

    /** Khi bật (prod), webhook thiếu token cấu hình sẽ bị từ chối (fail-closed) thay vì chấp nhận vô điều kiện. */
    @Value("${app.vietqr.webhook-require-token:false}")
    private boolean webhookRequireToken;

    private static final Logger log = LoggerFactory.getLogger(VietQRService.class);
    private final VietQRWebhookTransactionRepository webhookRepo;

    public VietQRService(VietQRWebhookTransactionRepository webhookRepo) {
        this.webhookRepo = webhookRepo;
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
        StringBuilder sb = new StringBuilder();
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return "NF" + sb.toString();
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
        boolean tokenConfigured = webhookToken != null && !webhookToken.isBlank();
        if (tokenConfigured) {
            if (authHeader == null || !authHeader.contains(webhookToken)) {
                log.warn("Invalid webhook token received");
                return false;
            }
        } else if (webhookRequireToken) {
            // Fail-closed: từ chối webhook không xác thực khi cấu hình yêu cầu token (tránh nạp/thanh toán khống).
            log.error("VietQR webhook token is required but not configured — rejecting unauthenticated webhook");
            return false;
        }

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
        tx.setSubAccount(payload.getSubAccount());
        tx.setGateway(payload.getGateway());
        tx.setTransactionDate(OffsetDateTime.now());
        tx.setStatus("UNUSED");
        webhookRepo.save(tx);

        log.info("Saved new VietQR transaction: {}", payload.getReferenceCode());
        return true;
    }

    public boolean checkPaymentStatus(String code, BigDecimal amount) {
        List<VietQRWebhookTransaction> txs = webhookRepo.findMatchingUnusedTransaction(code, amount);
        return !txs.isEmpty();
    }
}
