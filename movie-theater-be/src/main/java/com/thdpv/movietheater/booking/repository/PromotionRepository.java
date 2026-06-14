package com.thdpv.movietheater.booking.repository;

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Promotion p where lower(p.code) = lower(:code)")
    Optional<Promotion> findByCodeIgnoreCaseForUpdate(@Param("code") String code);
}
