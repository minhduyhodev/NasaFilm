package com.thdpv.movietheater.booking.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findFirstByBookingUuidOrderByCreatedAtDesc(UUID bookingUuid);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    @Query("""
            SELECT p FROM Payment p
            WHERE p.bookingUuid IN :bookingUuids
              AND p.createdAt = (
                  SELECT MAX(p2.createdAt) FROM Payment p2 WHERE p2.bookingUuid = p.bookingUuid
              )
            """)
    List<Payment> findLatestByBookingUuidIn(@Param("bookingUuids") Collection<UUID> bookingUuids);
}
