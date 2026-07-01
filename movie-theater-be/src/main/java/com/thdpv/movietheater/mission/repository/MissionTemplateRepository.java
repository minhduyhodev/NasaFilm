package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.mission.entity.MissionTemplate;

public interface MissionTemplateRepository extends JpaRepository<MissionTemplate, UUID> {

    List<MissionTemplate> findByActiveTrueOrderBySortOrderAscTitleAsc();

    Optional<MissionTemplate> findByCodeIgnoreCase(String code);
}
