package com.thdpv.movietheater.staff.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.staff.entity.StaffGateEvent;

public interface StaffGateEventRepository extends JpaRepository<StaffGateEvent, UUID> {

    List<StaffGateEvent> findByShowtimeUuidAndEventTypeInOrderByCreatedAtDesc(
            UUID showtimeUuid,
            Collection<String> eventTypes,
            Pageable pageable);
}
