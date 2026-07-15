package com.thdpv.movietheater.hr.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.hr.entity.Attendance;
import com.thdpv.movietheater.hr.enums.ApprovalStatus;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    Optional<Attendance> findByShiftAssignmentUuid(UUID shiftAssignmentUuid);

    List<Attendance> findByShiftAssignmentUuidIn(Collection<UUID> shiftAssignmentUuids);

    boolean existsByShiftAssignmentUuid(UUID shiftAssignmentUuid);

    List<Attendance> findByUserUuidAndWorkDateBetweenOrderByWorkDateDescCreatedAtDesc(
            UUID userUuid, LocalDate from, LocalDate to);

    List<Attendance> findByApprovalStatusAndWorkDateBetween(
            ApprovalStatus approvalStatus, LocalDate from, LocalDate to);

    @Query("""
            SELECT a FROM Attendance a
            WHERE a.workDate BETWEEN :from AND :to
              AND (:userUuid IS NULL OR a.userUuid = :userUuid)
              AND (:approvalStatus IS NULL OR a.approvalStatus = :approvalStatus)
            ORDER BY a.workDate DESC, a.createdAt DESC
            """)
    List<Attendance> search(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("userUuid") UUID userUuid,
            @Param("approvalStatus") ApprovalStatus approvalStatus);
}
