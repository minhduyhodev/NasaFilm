package com.thdpv.movietheater.payment.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.payment.entity.PaymentTransaction;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {
    
    Optional<PaymentTransaction> findByGatewayTransactionId(String gatewayTransactionId);
    
    Optional<PaymentTransaction> findByBookingUuid(UUID bookingUuid);

    /**
     * Atomically binds a succeeded transaction to a booking so a single Stripe payment can back only one
     * booking. Returns 1 when this booking won the claim, 0 when it was already claimed or is not (yet) SUCCESS.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PaymentTransaction t SET t.bookingUuid = :bookingUuid, t.updatedAt = :now "
            + "WHERE t.gatewayTransactionId = :gatewayTransactionId AND t.bookingUuid IS NULL "
            + "AND t.status = 'SUCCESS'")
    int claimSucceededForBooking(@Param("gatewayTransactionId") String gatewayTransactionId,
            @Param("bookingUuid") UUID bookingUuid,
            @Param("now") OffsetDateTime now);

    /**
     * Atomically transitions a transaction from one status to another. Returns 1 when this thread won the
     * transition, 0 when it was already changed — so only one concurrent request credits a top-up.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PaymentTransaction t SET t.status = :toStatus, t.updatedAt = :now "
            + "WHERE t.uuid = :uuid AND t.status = :fromStatus")
    int transitionStatus(@Param("uuid") UUID uuid,
            @Param("fromStatus") String fromStatus,
            @Param("toStatus") String toStatus,
            @Param("now") OffsetDateTime now);
}
