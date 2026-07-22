package com.thdpv.movietheater.support.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.entity.SupportModerationViolation;
import com.thdpv.movietheater.support.repository.SupportModerationViolationRepository;

class SupportChatPenaltyServiceTest {

    @Test
    void firstTextViolationWarnsWithoutBan() {
        SupportModerationViolationRepository repository = mockRepository(List.of());
        SupportChatPenaltyService service = new SupportChatPenaltyService(repository);

        SupportChatPenaltyService.PenaltyResult result =
                service.recordTextViolation("user@example.com");

        assertEquals(1, result.level());
        assertNull(result.blockedUntil());
    }

    @Test
    void secondTextViolationBansForFiveMinutes() {
        SupportModerationViolation prior = violation(1);
        SupportModerationViolationRepository repository = mockRepository(List.of(prior));
        SupportChatPenaltyService service = new SupportChatPenaltyService(repository);

        SupportChatPenaltyService.PenaltyResult result =
                service.recordTextViolation("user@example.com");

        assertEquals(2, result.level());
        assertNotNull(result.blockedUntil());
        assertTrue(result.blockedUntil().isAfter(OffsetDateTime.now().plusMinutes(4)));
    }

    @Test
    void sensitiveImageStartsAtThirtyMinuteBan() {
        SupportModerationViolationRepository repository = mockRepository(List.of());
        SupportChatPenaltyService service = new SupportChatPenaltyService(repository);

        SupportChatPenaltyService.PenaltyResult result =
                service.recordSensitiveImageViolation("user@example.com");

        assertEquals(3, result.level());
        assertNotNull(result.blockedUntil());
        assertTrue(result.blockedUntil().isAfter(OffsetDateTime.now().plusMinutes(29)));
    }

    @Test
    void activeBanBlocksChat() {
        SupportModerationViolationRepository repository = mockRepository(List.of());
        SupportModerationViolation active = violation(3);
        active.setBlockedUntil(OffsetDateTime.now().plusMinutes(20));
        when(repository.findFirstByUserEmailIgnoreCaseAndBlockedUntilAfterOrderByBlockedUntilDesc(
                anyString(), any(OffsetDateTime.class)))
                .thenReturn(Optional.of(active));
        SupportChatPenaltyService service = new SupportChatPenaltyService(repository);

        assertThrows(AppException.class,
                () -> service.assertChatAllowed("user@example.com"));
    }

    @Test
    void raiseViolationIncludesWarningHint() {
        SupportModerationViolationRepository repository = mockRepository(List.of());
        SupportChatPenaltyService service = new SupportChatPenaltyService(repository);
        SupportChatPenaltyService.PenaltyResult warning =
                new SupportChatPenaltyService.PenaltyResult(1, null, "WARNING");

        AppException ex = assertThrows(AppException.class,
                () -> service.raiseViolation(ErrorCode.SUPPORT_BANNED_WORD, null, warning));

        assertTrue(ex.getMessage().contains("cảnh báo mức 1"));
        assertEquals(ErrorCode.SUPPORT_BANNED_WORD, ex.getErrorCode());
    }

    private SupportModerationViolationRepository mockRepository(
            List<SupportModerationViolation> previous) {
        SupportModerationViolationRepository repository =
                mock(SupportModerationViolationRepository.class);
        when(repository.findByUserEmailIgnoreCaseAndCreatedAtAfter(
                anyString(), any(OffsetDateTime.class)))
                .thenReturn(previous);
        when(repository.saveAndFlush(any(SupportModerationViolation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findFirstByUserEmailIgnoreCaseAndBlockedUntilAfterOrderByBlockedUntilDesc(
                anyString(), any(OffsetDateTime.class)))
                .thenReturn(Optional.empty());
        return repository;
    }

    private SupportModerationViolation violation(int severity) {
        SupportModerationViolation item = new SupportModerationViolation();
        item.setSeverity(severity);
        return item;
    }
}
