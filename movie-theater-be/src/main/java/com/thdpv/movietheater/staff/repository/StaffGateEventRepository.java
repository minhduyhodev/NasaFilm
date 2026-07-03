package com.thdpv.movietheater.staff.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.staff.entity.StaffGateEvent;

@Repository
public interface StaffGateEventRepository extends JpaRepository<StaffGateEvent, UUID> {

    List<StaffGateEvent> findByShowtimeUuidAndEventTypeInOrderByCreatedAtDesc(
            UUID showtimeUuid,
            Collection<String> eventTypes,
            Pageable pageable);
}
