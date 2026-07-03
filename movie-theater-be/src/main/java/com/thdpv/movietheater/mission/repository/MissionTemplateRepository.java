package com.thdpv.movietheater.mission.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.mission.entity.MissionTemplate;

public interface MissionTemplateRepository extends JpaRepository<MissionTemplate, UUID> {

    List<MissionTemplate> findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc();

    List<MissionTemplate> findByDeletedAtIsNullOrderBySortOrderAscTitleAsc();

    List<MissionTemplate> findByDeletedAtIsNotNullOrderByDeletedAtDesc();

    @Query("""
            select t from MissionTemplate t
            where t.deletedAt is null
              and (:query is null or :query = ''
                   or lower(t.code) like lower(concat('%', :query, '%'))
                   or lower(t.title) like lower(concat('%', :query, '%'))
                   or lower(coalesce(t.description, '')) like lower(concat('%', :query, '%')))
            """)
    Page<MissionTemplate> searchActiveForAdmin(@Param("query") String query, Pageable pageable);

    @Query("""
            select t from MissionTemplate t
            where t.deletedAt is not null
              and (:query is null or :query = ''
                   or lower(t.code) like lower(concat('%', :query, '%'))
                   or lower(t.title) like lower(concat('%', :query, '%'))
                   or lower(coalesce(t.description, '')) like lower(concat('%', :query, '%')))
            """)
    Page<MissionTemplate> searchDeletedForAdmin(@Param("query") String query, Pageable pageable);

    long countByDeletedAtIsNull();

    long countByDeletedAtIsNotNull();

    long countByActiveTrueAndDeletedAtIsNull();

    Optional<MissionTemplate> findByCodeIgnoreCase(String code);

    Optional<MissionTemplate> findByCodeIgnoreCaseAndDeletedAtIsNull(String code);

    long countByCampaignUuid(UUID campaignUuid);

    long countByCampaignUuidAndDeletedAtIsNull(UUID campaignUuid);
}
