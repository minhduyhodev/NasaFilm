package com.thdpv.movietheater.payment.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.payment.entity.PaymentTransaction;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {
    
    Optional<PaymentTransaction> findByGatewayTransactionId(String gatewayTransactionId);
    
    Optional<PaymentTransaction> findByBookingUuid(UUID bookingUuid);
}
