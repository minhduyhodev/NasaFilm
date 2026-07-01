package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import com.thdpv.movietheater.mission.entity.UserMission;

import jakarta.persistence.LockModeType;

public interface UserMissionRepository extends JpaRepository<UserMission, UUID> {

    List<UserMission> findByUserUuidOrderByUpdatedAtDesc(UUID userUuid);

    Optional<UserMission> findByUserUuidAndMissionTemplateUuid(UUID userUuid, UUID missionTemplateUuid);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserMission> findWithLockByUserUuidAndMissionTemplateUuid(UUID userUuid, UUID missionTemplateUuid);
}
