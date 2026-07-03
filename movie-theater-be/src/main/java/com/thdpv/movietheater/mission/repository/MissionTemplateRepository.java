package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.mission.entity.MissionTemplate;

public interface MissionTemplateRepository extends JpaRepository<MissionTemplate, UUID> {

    List<MissionTemplate> findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc();

    List<MissionTemplate> findByDeletedAtIsNullOrderBySortOrderAscTitleAsc();

    List<MissionTemplate> findByDeletedAtIsNotNullOrderByDeletedAtDesc();

    Optional<MissionTemplate> findByCodeIgnoreCase(String code);

    Optional<MissionTemplate> findByCodeIgnoreCaseAndDeletedAtIsNull(String code);

    long countByCampaignUuid(UUID campaignUuid);

    long countByCampaignUuidAndDeletedAtIsNull(UUID campaignUuid);
}
