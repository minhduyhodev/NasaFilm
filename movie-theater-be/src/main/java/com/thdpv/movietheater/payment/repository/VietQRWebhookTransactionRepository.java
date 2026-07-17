package com.thdpv.movietheater.payment.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.payment.entity.VietQRWebhookTransaction;

public interface VietQRWebhookTransactionRepository extends JpaRepository<VietQRWebhookTransaction, Long> {

    Optional<VietQRWebhookTransaction> findByReferenceCode(String referenceCode);

    boolean existsByReferenceCode(String referenceCode);

    /**
     * Finds an unused transaction matching the transfer content containing the unique code and matching amount.
     */
    @Query("SELECT t FROM VietQRWebhookTransaction t WHERE t.status = 'UNUSED' AND LOWER(t.transferContent) LIKE LOWER(CONCAT('%', :code, '%')) AND t.amount = :amount ORDER BY t.createdAt DESC")
    List<VietQRWebhookTransaction> findMatchingUnusedTransaction(
            @Param("code") String code, 
            @Param("amount") BigDecimal amount);

    /**
     * Atomically claims an unused webhook transaction for a booking. Returns 1 when this booking won the claim,
     * 0 when another concurrent request already consumed it — preventing one transfer from paying two bookings.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE VietQRWebhookTransaction t SET t.status = 'USED', t.usedByBookingUuid = :bookingUuid "
            + "WHERE t.id = :id AND t.status = 'UNUSED'")
    int claimForBooking(@Param("id") Long id, @Param("bookingUuid") UUID bookingUuid);

    /**
     * Atomically marks an unused webhook transaction as used (wallet top-up, no booking). Returns 1 on win, 0 otherwise.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE VietQRWebhookTransaction t SET t.status = 'USED' WHERE t.id = :id AND t.status = 'UNUSED'")
    int markUsed(@Param("id") Long id);
}
