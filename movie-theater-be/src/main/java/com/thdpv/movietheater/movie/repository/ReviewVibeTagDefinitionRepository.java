package com.thdpv.movietheater.movie.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.movie.entity.ReviewVibeTagDefinition;

@Repository
public interface ReviewVibeTagDefinitionRepository extends JpaRepository<ReviewVibeTagDefinition, UUID> {

    List<ReviewVibeTagDefinition> findAllByOrderByDisplayOrderAscLabelAsc();

    List<ReviewVibeTagDefinition> findByActiveTrueOrderByDisplayOrderAscLabelAsc();

    Optional<ReviewVibeTagDefinition> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Query("""
            select count(d) > 0 from ReviewVibeTagDefinition d
            where lower(d.code) = lower(:code) and d.uuid <> :excludeUuid
            """)
    boolean existsByCodeIgnoreCaseAndUuidNot(
            @Param("code") String code,
            @Param("excludeUuid") UUID excludeUuid);
}
