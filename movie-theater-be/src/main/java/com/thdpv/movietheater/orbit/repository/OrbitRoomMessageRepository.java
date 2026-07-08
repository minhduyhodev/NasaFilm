package com.thdpv.movietheater.orbit.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.orbit.entity.OrbitRoomMessage;

@Repository
public interface OrbitRoomMessageRepository extends JpaRepository<OrbitRoomMessage, UUID> {
    List<OrbitRoomMessage> findByRoomUuidAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
            UUID roomUuid, OffsetDateTime createdAt);
}
