package com.thdpv.movietheater.booking.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.Refund;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    Optional<Refund> findFirstByBookingUuidOrderByCreatedAtDesc(UUID bookingUuid);

    Optional<Refund> findByIdempotencyKey(String idempotencyKey);

    List<Refund> findByStatusOrderByCreatedAtDesc(String status);

    List<Refund> findByStatusInOrderByCompletedAtDesc(Collection<String> statuses);
}
