package com.thdpv.movietheater.orbit.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.orbit.entity.OrbitMember;

public interface OrbitMemberRepository extends JpaRepository<OrbitMember, UUID> {

    List<OrbitMember> findByRoomUuidOrderByJoinedAtAsc(UUID roomUuid);

    Optional<OrbitMember> findByRoomUuidAndUserUuid(UUID roomUuid, UUID userUuid);

    long countByRoomUuid(UUID roomUuid);

    void deleteByRoomUuidAndUserUuid(UUID roomUuid, UUID userUuid);
}
