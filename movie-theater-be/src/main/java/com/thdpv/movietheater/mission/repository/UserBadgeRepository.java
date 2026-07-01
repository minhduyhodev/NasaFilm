package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.mission.entity.UserBadge;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UUID> {

    List<UserBadge> findByUserUuidOrderByUnlockedAtDesc(UUID userUuid);

    Optional<UserBadge> findByUserUuidAndBadgeCodeIgnoreCase(UUID userUuid, String badgeCode);
}
