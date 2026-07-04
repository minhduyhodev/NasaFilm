package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;

public interface MissionCampaignRepository extends JpaRepository<MissionCampaign, UUID> {

    Optional<MissionCampaign> findByCodeIgnoreCase(String code);

    List<MissionCampaign> findAllByOrderBySortOrderAscTitleAsc();

    List<MissionCampaign> findByStatusOrderBySortOrderAscTitleAsc(MissionCampaignStatus status);

    @Query("""
            select c from MissionCampaign c
            where (:query is null or :query = ''
                   or lower(c.code) like lower(concat('%', :query, '%'))
                   or lower(c.title) like lower(concat('%', :query, '%'))
                   or lower(coalesce(c.description, '')) like lower(concat('%', :query, '%')))
            """)
    Page<MissionCampaign> searchForAdmin(@Param("query") String query, Pageable pageable);

    long countByStatus(MissionCampaignStatus status);
}
