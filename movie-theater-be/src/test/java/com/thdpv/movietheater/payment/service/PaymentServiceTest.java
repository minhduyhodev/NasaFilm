package com.thdpv.movietheater.payment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "paymentProvider", "mock");
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
                bookingUuid, new BigDecimal("100000"), "MOCK", "pay-" + bookingUuid, null);

        assertSame(existing, result);
        verify(paymentGatewayService, never()).charge(any(), any(), any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void chargeBookingShouldPersistCompletedPaymentViaMockGateway() {
        UUID bookingUuid = UUID.randomUUID();
        String key = "pay-" + bookingUuid;

        when(paymentRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentGatewayService.charge(any(), any(), any()))
                .thenReturn(new PaymentGatewayService.GatewayChargeResult(true, "MOCK-PAY-ABCDEF12", null));

        Payment result = paymentService.chargeBooking(
                bookingUuid, new BigDecimal("150000"), "card", key, null);

        assertEquals(PaymentStatus.COMPLETED.name(), result.getStatus());
        assertEquals("CARD", result.getMethod());
        assertEquals("MOCK-PAY-ABCDEF12", result.getGatewayTransactionId());
        assertEquals(bookingUuid, result.getBookingUuid());

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertTrue(captor.getAllValues().stream()
                .anyMatch(p -> PaymentStatus.COMPLETED.name().equals(p.getStatus())));
    }

    @Test
    void chargeBookingShouldMarkFailedWhenGatewayRejects() {
        UUID bookingUuid = UUID.randomUUID();
        String key = "pay-" + bookingUuid;

        when(paymentRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentGatewayService.charge(any(), any(), any()))
                .thenReturn(new PaymentGatewayService.GatewayChargeResult(false, null, "Insufficient funds"));

        AppException ex = assertThrows(AppException.class, () -> paymentService.chargeBooking(
                bookingUuid, new BigDecimal("150000"), "MOCK", key, null));

        assertEquals(ErrorCode.BAD_REQUEST, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Insufficient funds"));
    }

    @Test
    void mockGatewayShouldBeIdempotentForSameKey() {
        MockPaymentGatewayService gateway = new MockPaymentGatewayService();
        UUID paymentUuid = UUID.randomUUID();
        PaymentGatewayService.GatewayChargeResult first = gateway.charge(paymentUuid, BigDecimal.TEN, "idem-1");
        PaymentGatewayService.GatewayChargeResult second = gateway.charge(paymentUuid, BigDecimal.TEN, "idem-1");
        assertEquals(first.gatewayTransactionId(), second.gatewayTransactionId());
        assertTrue(first.success());
    }
}
