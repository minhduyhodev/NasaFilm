package com.thdpv.movietheater.payment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.payment.dto.SePayWebhookPayload;
import com.thdpv.movietheater.payment.entity.VietQRWebhookTransaction;
import com.thdpv.movietheater.payment.repository.VietQRWebhookTransactionRepository;

@ExtendWith(MockitoExtension.class)
class VietQRServiceTest {

    @Mock
    private VietQRWebhookTransactionRepository webhookRepo;

    @InjectMocks
    private VietQRService vietQRService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(vietQRService, "webhookToken", "secret-token");
        ReflectionTestUtils.setField(vietQRService, "webhookRequireToken", true);
    }

    @Test
    void processWebhookShouldRejectMissingTokenWhenRequired() {
        ReflectionTestUtils.setField(vietQRService, "webhookToken", "");
        SePayWebhookPayload payload = samplePayload();

        AppException ex = assertThrows(AppException.class,
                () -> vietQRService.processWebhook(payload, null));

        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        verify(webhookRepo, never()).save(any());
    }

    @Test
    void processWebhookShouldRejectWrongToken() {
        SePayWebhookPayload payload = samplePayload();

        AppException ex = assertThrows(AppException.class,
                () -> vietQRService.processWebhook(payload, "Bearer wrong"));

        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        verify(webhookRepo, never()).save(any());
    }

    @Test
    void processWebhookShouldAcceptBearerTokenAndPersistTransferCode() {
        SePayWebhookPayload payload = samplePayload();
        when(webhookRepo.existsByReferenceCode("REF-1")).thenReturn(false);
        when(webhookRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertTrue(vietQRService.processWebhook(payload, "Bearer secret-token"));

        ArgumentCaptor<VietQRWebhookTransaction> captor = ArgumentCaptor.forClass(VietQRWebhookTransaction.class);
        verify(webhookRepo).save(captor.capture());
        assertEquals("NFABC123XY", captor.getValue().getTransferCode());
    }

    @Test
    void tokenMatchesShouldSupportRawAndBearer() {
        assertTrue(VietQRService.tokenMatches("secret-token", "secret-token"));
        assertTrue(VietQRService.tokenMatches("Bearer secret-token", "secret-token"));
        assertTrue(VietQRService.tokenMatches("Apikey secret-token", "secret-token"));
        assertFalse(VietQRService.tokenMatches("Bearer other", "secret-token"));
        assertFalse(VietQRService.tokenMatches(null, "secret-token"));
    }

    @Test
    void extractTransferCodeFromBankContent() {
        assertEquals("NFABC12345", VietQRService.extractTransferCode("NASAFILM NFABC12345"));
        assertEquals("NFABC12345", VietQRService.extractTransferCode("CK NFABC12345 MB"));
        assertNull(VietQRService.extractTransferCode("no code here"));
    }

    @Test
    void processWebhookShouldAllowUnauthenticatedOnlyWhenRequireTokenFalse() {
        ReflectionTestUtils.setField(vietQRService, "webhookToken", "");
        ReflectionTestUtils.setField(vietQRService, "webhookRequireToken", false);
        SePayWebhookPayload payload = samplePayload();
        when(webhookRepo.existsByReferenceCode("REF-1")).thenReturn(false);
        when(webhookRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertTrue(vietQRService.processWebhook(payload, null));
        verify(webhookRepo).save(any());
    }

    private static SePayWebhookPayload samplePayload() {
        SePayWebhookPayload payload = new SePayWebhookPayload();
        payload.setReferenceCode("REF-1");
        payload.setAmount(new BigDecimal("100000"));
        payload.setContent("NASAFILM NFABC123XY");
        return payload;
    }
}
