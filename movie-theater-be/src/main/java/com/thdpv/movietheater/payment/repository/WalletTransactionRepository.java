package com.thdpv.movietheater.payment.repository;

import java.util.List;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.payment.entity.WalletTransaction;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    List<WalletTransaction> findTop20ByUserUuidOrderByCreatedAtDesc(UUID userUuid);

    Page<WalletTransaction> findByUserUuidOrderByCreatedAtDesc(UUID userUuid, Pageable pageable);

    Page<WalletTransaction> findByUserUuidAndTypeOrderByCreatedAtDesc(UUID userUuid, String type, Pageable pageable);

    Page<WalletTransaction> findByUserUuidAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            UUID userUuid, OffsetDateTime start, OffsetDateTime end, Pageable pageable);

    Page<WalletTransaction> findByUserUuidAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            UUID userUuid, String type, OffsetDateTime start, OffsetDateTime end, Pageable pageable);

    boolean existsByReferenceUuid(UUID referenceUuid);
}
