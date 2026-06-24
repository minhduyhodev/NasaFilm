package com.thdpv.movietheater.booking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findFirstByBookingUuidOrderByCreatedAtDesc(UUID bookingUuid);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
}
