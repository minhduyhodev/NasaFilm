package com.thdpv.movietheater.hr.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.hr.entity.ShiftSwapRequest;
import com.thdpv.movietheater.hr.enums.RequestStatus;

public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequest, UUID> {

    @Query("""
            SELECT s FROM ShiftSwapRequest s
            WHERE s.requesterUuid = :userId OR s.counterpartUuid = :userId
            ORDER BY s.createdAt DESC
            """)
    List<ShiftSwapRequest> findMine(@Param("userId") UUID userId);

    @Query("""
            SELECT s FROM ShiftSwapRequest s
            WHERE (:status IS NULL OR s.status = :status)
            ORDER BY s.createdAt DESC
            """)
    List<ShiftSwapRequest> search(@Param("status") RequestStatus status);

    boolean existsByRequesterAssignmentUuidAndStatus(UUID requesterAssignmentUuid, RequestStatus status);

    boolean existsByCounterpartAssignmentUuidAndStatus(UUID counterpartAssignmentUuid, RequestStatus status);
}
