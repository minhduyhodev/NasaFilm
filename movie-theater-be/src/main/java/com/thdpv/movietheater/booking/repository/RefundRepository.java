package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.Refund;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    Optional<Refund> findFirstByBookingUuidOrderByCreatedAtDesc(UUID bookingUuid);

    Optional<Refund> findByIdempotencyKey(String idempotencyKey);

    List<Refund> findByStatusOrderByCreatedAtDesc(String status);

    List<Refund> findByStatusInOrderByCompletedAtDesc(Collection<String> statuses);

    /**
     * Atomic guard against double-approval: only one caller can flip the row
     * from {@code currentStatus} to {@code newStatus}. Returns rows affected (1 = won, 0 = lost/already moved).
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Refund r SET r.status = :newStatus, r.updatedAt = :now "
            + "WHERE r.uuid = :uuid AND r.status = :currentStatus")
    int transitionStatus(@Param("uuid") UUID uuid,
            @Param("currentStatus") String currentStatus,
            @Param("newStatus") String newStatus,
            @Param("now") OffsetDateTime now);
}
