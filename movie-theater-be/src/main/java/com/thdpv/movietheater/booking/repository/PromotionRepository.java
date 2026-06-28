package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.booking.entity.Promotion;
import jakarta.persistence.LockModeType;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    Optional<Promotion> findByCodeIgnoreCase(String code);

    List<Promotion> findAllByDeletedAtIsNull();

    @Query("""
            SELECT p FROM Promotion p
            WHERE p.deletedAt IS NULL
              AND UPPER(p.status) = 'ACTIVE'
              AND (p.startDate IS NULL OR p.startDate <= :now)
              AND (p.endDate IS NULL OR p.endDate >= :now)
            """)
    List<Promotion> findEligiblePromotions(@Param("now") OffsetDateTime now);

    Optional<Promotion> findByIdAndDeletedAtIsNull(UUID id);

    @Query("select p from Promotion p where lower(p.code) = lower(:code) and p.deletedAt is null")
    Optional<Promotion> findActiveByCodeIgnoreCase(@Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Promotion p where lower(p.code) = lower(:code) and p.deletedAt is null")
    Optional<Promotion> findByCodeIgnoreCaseForUpdate(@Param("code") String code);
}
