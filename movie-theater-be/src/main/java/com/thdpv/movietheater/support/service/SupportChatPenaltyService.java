package com.thdpv.movietheater.support.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.entity.SupportModerationViolation;
import com.thdpv.movietheater.support.repository.SupportModerationViolationRepository;

@Service
public class SupportChatPenaltyService {

    public static final int TEXT_SEVERITY = 1;
    public static final int SENSITIVE_IMAGE_SEVERITY = 3;
    private static final int SCORE_WINDOW_DAYS = 30;
    private static final DateTimeFormatter BAN_TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final SupportModerationViolationRepository violationRepository;

    public SupportChatPenaltyService(
            SupportModerationViolationRepository violationRepository) {
        this.violationRepository = violationRepository;
    }

    @Transactional(readOnly = true)
    public void assertChatAllowed(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        violationRepository
                .findFirstByUserEmailIgnoreCaseAndBlockedUntilAfterOrderByBlockedUntilDesc(
                        normalizeEmail(userEmail),
                        now)
                .ifPresent(violation -> {
                    throw bannedException(violation.getBlockedUntil());
                });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PenaltyResult recordTextViolation(String userEmail) {
        return recordViolation(userEmail, "PROFANITY", TEXT_SEVERITY,
                "Tin nhắn chứa từ ngữ không phù hợp");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PenaltyResult recordSensitiveImageViolation(String userEmail) {
        return recordViolation(userEmail, "SENSITIVE_IMAGE", SENSITIVE_IMAGE_SEVERITY,
                "Ảnh bị hệ thống kiểm duyệt đánh dấu nhạy cảm");
    }

    /**
     * Throws a moderation AppException with escalating ban/warning text.
     *
     * @param detailMessage optional override; null/blank uses {@link ErrorCode#getMessage()}
     */
    public void raiseViolation(
            ErrorCode errorCode,
            String detailMessage,
            PenaltyResult penalty) {
        String message = (detailMessage == null || detailMessage.isBlank())
                ? errorCode.getMessage()
                : detailMessage;
        if (penalty != null && penalty.blockedUntil() != null) {
            message = message
                    + " Chat hỗ trợ bị khóa đến "
                    + penalty.blockedUntil().format(BAN_TIME_FORMAT)
                    + " (mức "
                    + penalty.level()
                    + ").";
        } else {
            message = message + " Đây là cảnh báo mức 1; tái phạm sẽ bị khóa chat.";
        }
        throw new AppException(errorCode, message);
    }

    private PenaltyResult recordViolation(
            String userEmail,
            String violationType,
            int severity,
            String details) {
        if (userEmail == null || userEmail.isBlank()) {
            return new PenaltyResult(1, null, "WARNING");
        }

        String normalizedEmail = normalizeEmail(userEmail);
        OffsetDateTime now = OffsetDateTime.now();
        int previousScore = violationRepository
                .findByUserEmailIgnoreCaseAndCreatedAtAfter(
                        normalizedEmail,
                        now.minusDays(SCORE_WINDOW_DAYS))
                .stream()
                .mapToInt(SupportModerationViolation::getSeverity)
                .sum();
        int score = previousScore + severity;
        Penalty penalty = resolvePenalty(score, now);

        SupportModerationViolation violation = new SupportModerationViolation();
        violation.setUserEmail(normalizedEmail);
        violation.setViolationType(violationType);
        violation.setSeverity(severity);
        violation.setPenaltyAction(penalty.action());
        violation.setBlockedUntil(penalty.blockedUntil());
        violation.setDetails(details);
        violationRepository.saveAndFlush(violation);

        return new PenaltyResult(penalty.level(), penalty.blockedUntil(), penalty.action());
    }

    private Penalty resolvePenalty(int score, OffsetDateTime now) {
        if (score <= 1) {
            return new Penalty(1, "WARNING", null);
        }
        if (score == 2) {
            return new Penalty(2, "CHAT_BAN_5_MINUTES", now.plusMinutes(5));
        }
        if (score <= 4) {
            return new Penalty(3, "CHAT_BAN_30_MINUTES", now.plusMinutes(30));
        }
        if (score <= 6) {
            return new Penalty(4, "CHAT_BAN_24_HOURS", now.plusHours(24));
        }
        return new Penalty(5, "CHAT_BAN_7_DAYS", now.plusDays(7));
    }

    private AppException bannedException(OffsetDateTime blockedUntil) {
        long minutes = Math.max(
                1,
                Duration.between(OffsetDateTime.now(), blockedUntil).toMinutes() + 1);
        String label = formatBanDuration(minutes);
        return new AppException(
                ErrorCode.SUPPORT_CHAT_BANNED,
                "Bạn đang bị khóa chat hỗ trợ trong khoảng " + label
                        + ", đến " + blockedUntil.format(BAN_TIME_FORMAT)
                        + ", do vi phạm tiêu chuẩn cộng đồng.");
    }

    private static String formatBanDuration(long minutes) {
        if (minutes >= 1440) {
            return Math.max(1, (minutes + 1439) / 1440) + " ngày";
        }
        if (minutes >= 60) {
            return Math.max(1, (minutes + 59) / 60) + " giờ";
        }
        return minutes + " phút";
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private record Penalty(int level, String action, OffsetDateTime blockedUntil) {
    }

    public record PenaltyResult(int level, OffsetDateTime blockedUntil, String action) {
    }
}
