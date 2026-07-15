package com.thdpv.movietheater.hr.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.ShiftAssignment;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {

    List<ShiftAssignment> findByWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(LocalDate from, LocalDate to);

    List<ShiftAssignment> findByUserUuidAndWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(
            UUID userUuid, LocalDate from, LocalDate to);

    boolean existsByUserUuidAndWorkDateAndShiftDefinitionUuid(
            UUID userUuid, LocalDate workDate, UUID shiftDefinitionUuid);

    List<ShiftAssignment> findByWorkDateLessThanAndStatus(
            LocalDate workDate, com.thdpv.movietheater.hr.enums.ShiftAssignmentStatus status);
}
