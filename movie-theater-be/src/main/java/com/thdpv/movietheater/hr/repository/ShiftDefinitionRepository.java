package com.thdpv.movietheater.hr.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.ShiftDefinition;

public interface ShiftDefinitionRepository extends JpaRepository<ShiftDefinition, UUID> {

    List<ShiftDefinition> findByActiveTrueOrderBySortOrderAsc();

    List<ShiftDefinition> findAllByOrderBySortOrderAsc();

    Optional<ShiftDefinition> findByCode(String code);
}
