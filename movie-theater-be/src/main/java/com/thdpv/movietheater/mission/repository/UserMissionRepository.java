package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import com.thdpv.movietheater.mission.entity.UserMission;
import com.thdpv.movietheater.mission.enums.UserMissionStatus;

import jakarta.persistence.LockModeType;

public interface UserMissionRepository extends JpaRepository<UserMission, UUID> {

    List<UserMission> findByUserUuidOrderByUpdatedAtDesc(UUID userUuid);

    Optional<UserMission> findByUserUuidAndMissionTemplateUuidAndCycleKey(
            UUID userUuid, UUID missionTemplateUuid, String cycleKey);

    List<UserMission> findByUserUuidAndStatusOrderByCompletedAtDesc(
            UUID userUuid, UserMissionStatus status, Pageable pageable);

    long countByMissionTemplateUuid(UUID missionTemplateUuid);

    long countByMissionTemplateUuidAndStatus(UUID missionTemplateUuid, UserMissionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserMission> findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
            UUID userUuid, UUID missionTemplateUuid, String cycleKey);
}
