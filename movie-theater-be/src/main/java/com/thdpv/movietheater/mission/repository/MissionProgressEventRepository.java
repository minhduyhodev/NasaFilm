package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.mission.entity.MissionProgressEvent;

public interface MissionProgressEventRepository extends JpaRepository<MissionProgressEvent, UUID> {

    List<MissionProgressEvent> findByUserUuidAndSourceId(UUID userUuid, String sourceId);

    List<MissionProgressEvent> findByUserUuidAndMissionTemplateUuidAndCycleKeyOrderByEventAtAsc(
            UUID userUuid, UUID missionTemplateUuid, String cycleKey);

    boolean existsByUserUuidAndMissionTemplateUuidAndCycleKeyAndSourceTypeAndSourceId(
            UUID userUuid,
            UUID missionTemplateUuid,
            String cycleKey,
            String sourceType,
            String sourceId);

    @Modifying
    @Query("""
            delete from MissionProgressEvent e
            where e.userUuid = :userUuid
              and e.sourceId = :sourceId
              and e.sourceType in :sourceTypes
            """)
    void deleteByUserUuidAndSourceIdAndSourceTypeIn(
            @Param("userUuid") UUID userUuid,
            @Param("sourceId") String sourceId,
            @Param("sourceTypes") List<String> sourceTypes);
}
