package com.thdpv.movietheater.booking.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.booking.entity.Promotion;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    Optional<Promotion> findByCodeIgnoreCase(String code);
}
