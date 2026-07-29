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
     * Prefer exact transfer_code match; fall back to word-boundary regex on transfer_content for legacy rows.
     */
    @Query(value = """
            SELECT * FROM vietqr_webhook_transaction t
            WHERE t.status = 'UNUSED'
              AND t.amount = :amount
              AND (
                UPPER(t.transfer_code) = UPPER(:code)
                OR (
                  (t.transfer_code IS NULL OR t.transfer_code = '')
                  AND LOWER(t.transfer_content) ~ ('(^|[^a-z0-9])' || LOWER(:code) || '([^a-z0-9]|$)')
                )
              )
            ORDER BY t.created_at DESC
            """, nativeQuery = true)
    List<VietQRWebhookTransaction> findMatchingUnusedTransaction(
            @Param("code") String code,
            @Param("amount") BigDecimal amount);

    /**
     * Atomically claims an unused webhook transaction for a booking. Returns 1 when this booking won the claim,
     * 0 when another concurrent request already consumed it — preventing one transfer from paying two bookings.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE VietQRWebhookTransaction t SET t.status = 'USED', t.usedByBookingUuid = :bookingUuid "
            + "WHERE t.id = :id AND t.status = 'UNUSED'")
    int claimForBooking(@Param("id") Long id, @Param("bookingUuid") UUID bookingUuid);

    /**
     * Atomically marks an unused webhook transaction as used (wallet top-up, no booking). Returns 1 on win, 0 otherwise.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE VietQRWebhookTransaction t SET t.status = 'USED' WHERE t.id = :id AND t.status = 'UNUSED'")
    int markUsed(@Param("id") Long id);
}
