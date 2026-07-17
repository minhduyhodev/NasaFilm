package com.thdpv.movietheater.notification.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.thdpv.movietheater.auth.service.EmailService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class WalletNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(WalletNotificationService.class);
    private static final NumberFormat VND_FORMAT = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));

    private final EmailService emailService;
    private final UserRepository userRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public WalletNotificationService(EmailService emailService, UserRepository userRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    public void notifyTopUpAfterCommit(UUID userUuid, BigDecimal amount, BigDecimal balanceAfter, String method) {
        runAfterCommit(() -> sendTopUpEmail(userUuid, amount, balanceAfter, method));
    }

    public void notifyWithdrawAfterCommit(UUID userUuid, BigDecimal amount, BigDecimal balanceAfter, String method) {
        runAfterCommit(() -> sendWithdrawEmail(userUuid, amount, balanceAfter, method));
    }

    private void sendTopUpEmail(UUID userUuid, BigDecimal amount, BigDecimal balanceAfter, String method) {
        User user = loadUserWithEmail(userUuid);
        if (user == null) {
            return;
        }
        try {
            emailService.sendTemplatedEmail(
                    EmailTemplateService.CODE_WALLET_TOP_UP,
                    user.getEmail(),
                    buildVariables(user, amount, balanceAfter, method));
        } catch (Exception ex) {
            logger.warn("[WalletNotification] Failed to send top-up email to {}: {}",
                    user.getEmail(), ex.getMessage());
        }
    }

    private void sendWithdrawEmail(UUID userUuid, BigDecimal amount, BigDecimal balanceAfter, String method) {
        User user = loadUserWithEmail(userUuid);
        if (user == null) {
            return;
        }
        try {
            emailService.sendTemplatedEmail(
                    EmailTemplateService.CODE_WALLET_WITHDRAW,
                    user.getEmail(),
                    buildVariables(user, amount, balanceAfter, method));
        } catch (Exception ex) {
            logger.warn("[WalletNotification] Failed to send withdraw email to {}: {}",
                    user.getEmail(), ex.getMessage());
        }
    }

    private Map<String, String> buildVariables(User user, BigDecimal amount, BigDecimal balanceAfter, String method) {
        String customerName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getEmail();

        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("CUSTOMER_NAME", customerName);
        variables.put("AMOUNT", formatVnd(amount));
        variables.put("BALANCE_AFTER", formatVnd(balanceAfter));
        variables.put("METHOD", method != null && !method.isBlank() ? method : "Ví NASA");
        variables.put("WALLET_URL", frontendUrl + "/wallet");
        return variables;
    }

    private User loadUserWithEmail(UUID userUuid) {
        if (userUuid == null) {
            return null;
        }
        User user = userRepository.findById(userUuid).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return null;
        }
        return user;
    }

    private String formatVnd(BigDecimal amount) {
        BigDecimal safe = amount != null ? amount.setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        return VND_FORMAT.format(safe) + " đ";
    }

    private void runAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
