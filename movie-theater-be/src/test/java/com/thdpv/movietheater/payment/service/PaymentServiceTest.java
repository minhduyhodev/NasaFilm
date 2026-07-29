package com.thdpv.movietheater.payment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.booking.entity.Payment;
import com.thdpv.movietheater.booking.enums.PaymentStatus;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.PaymentRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentGatewayService paymentGatewayService;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private WalletService walletService;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "paymentProvider", "stripe");
    }

    @Test
    void chargeBookingShouldReuseCompletedPaymentForSameIdempotencyKey() {
        UUID bookingUuid = UUID.randomUUID();
        Payment existing = new Payment();
        existing.setUuid(UUID.randomUUID());
        existing.setBookingUuid(bookingUuid);
        existing.setAmount(new BigDecimal("100000"));
        existing.setStatus(PaymentStatus.COMPLETED.name());
        existing.setIdempotencyKey("pay-" + bookingUuid);

        when(paymentRepository.findByIdempotencyKey("pay-" + bookingUuid)).thenReturn(Optional.of(existing));

        Payment result = paymentService.chargeBooking(
                bookingUuid, new BigDecimal("100000"), "CARD", "pay-" + bookingUuid, null);

        assertSame(existing, result);
        verify(paymentGatewayService, never()).charge(any(), any(), any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void chargeBookingCardShouldCompleteWithoutUnsupportedGateway() {
        UUID bookingUuid = UUID.randomUUID();
        String key = "pay-" + bookingUuid;
        String piId = "pi_test_abc123";

        PaymentTransaction tx = new PaymentTransaction();
        tx.setGatewayTransactionId(piId);

        when(paymentRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentTransactionRepository.findByBookingUuid(bookingUuid)).thenReturn(Optional.of(tx));

        Payment result = paymentService.chargeBooking(
                bookingUuid, new BigDecimal("150000"), "card", key, null);

        assertEquals(PaymentStatus.COMPLETED.name(), result.getStatus());
        assertEquals("CARD", result.getMethod());
        assertEquals("STRIPE", result.getGatewayProvider());
        assertEquals(piId, result.getGatewayTransactionId());
        assertEquals(bookingUuid, result.getBookingUuid());
        verify(paymentGatewayService, never()).charge(any(), any(), any());

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertTrue(captor.getAllValues().stream()
                .anyMatch(p -> PaymentStatus.COMPLETED.name().equals(p.getStatus())));
    }

    @Test
    void chargeBookingShouldMarkFailedWhenGatewayRejectsUnsupportedMethod() {
        UUID bookingUuid = UUID.randomUUID();
        String key = "pay-" + bookingUuid;

        when(paymentRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentGatewayService.charge(any(), any(), any()))
                .thenReturn(new PaymentGatewayService.GatewayChargeResult(false, null, "Insufficient funds"));

        AppException ex = assertThrows(AppException.class, () -> paymentService.chargeBooking(
                bookingUuid, new BigDecimal("150000"), "MOMO", key, null));

        assertEquals(ErrorCode.BAD_REQUEST, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Insufficient funds"));
    }

    @Test
    void unsupportedGatewayShouldRejectCharge() {
        UnsupportedPaymentGatewayService gateway = new UnsupportedPaymentGatewayService();
        PaymentGatewayService.GatewayChargeResult result =
                gateway.charge(UUID.randomUUID(), BigDecimal.TEN, "idem-1");
        assertFalse(result.success());
        assertTrue(result.failureReason().contains("giả lập"));
    }
}
