package com.thdpv.movietheater.hr.repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
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

    List<Attendance> findByApprovalStatusAndUserUuidAndWorkDateBetween(
            ApprovalStatus approvalStatus, UUID userUuid, LocalDate from, LocalDate to);

    /** Đếm chấm công theo trạng thái duyệt trong khoảng ngày (dùng phát hiện công chưa duyệt trong kỳ lương). */
    long countByApprovalStatusAndWorkDateBetween(
            ApprovalStatus approvalStatus, LocalDate from, LocalDate to);

    /** Có chấm công được duyệt trong kỳ SAU thời điểm sinh phiếu -> kỳ lương đã "lỗi thời". */
    boolean existsByApprovalStatusAndWorkDateBetweenAndApprovedAtAfter(
            ApprovalStatus approvalStatus, LocalDate from, LocalDate to, OffsetDateTime approvedAt);

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
