package com.thdpv.movietheater.payment.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
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
}
