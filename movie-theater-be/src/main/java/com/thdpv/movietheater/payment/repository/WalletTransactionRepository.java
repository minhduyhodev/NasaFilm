package com.thdpv.movietheater.payment.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.payment.entity.WalletTransaction;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    List<WalletTransaction> findTop20ByUserUuidOrderByCreatedAtDesc(UUID userUuid);

    boolean existsByReferenceUuid(UUID referenceUuid);
}
