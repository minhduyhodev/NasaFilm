package com.thdpv.movietheater.hr.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.hr.entity.LeaveRequest;
import com.thdpv.movietheater.hr.enums.RequestStatus;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    List<LeaveRequest> findByUserUuidOrderByCreatedAtDesc(UUID userUuid);

    boolean existsByUserUuidAndStatusAndFromDateLessThanEqualAndToDateGreaterThanEqual(
            UUID userUuid, RequestStatus status, LocalDate onOrBefore, LocalDate onOrAfter);

    @Query("""
            SELECT l FROM LeaveRequest l
            WHERE l.status = :status AND l.userUuid IN :userIds
              AND l.fromDate <= :to AND l.toDate >= :from
            """)
    List<LeaveRequest> findOverlapping(
            @Param("status") RequestStatus status,
            @Param("userIds") Collection<UUID> userIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
            SELECT l FROM LeaveRequest l
            WHERE (:status IS NULL OR l.status = :status)
              AND (:userId IS NULL OR l.userUuid = :userId)
            ORDER BY l.createdAt DESC
            """)
    List<LeaveRequest> search(
            @Param("status") RequestStatus status,
            @Param("userId") UUID userId);
}
