package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;

public interface MissionCampaignRepository extends JpaRepository<MissionCampaign, UUID> {

    Optional<MissionCampaign> findByCodeIgnoreCase(String code);

    List<MissionCampaign> findAllByOrderBySortOrderAscTitleAsc();

    List<MissionCampaign> findByStatusOrderBySortOrderAscTitleAsc(MissionCampaignStatus status);
}
