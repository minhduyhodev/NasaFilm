package com.thdpv.movietheater.orbit.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;

public interface OrbitRoomRepository extends JpaRepository<OrbitRoom, UUID> {

    @Query("""
            select r from OrbitRoom r
            where r.status in (
                com.thdpv.movietheater.orbit.enums.OrbitRoomStatus.OPEN,
                com.thdpv.movietheater.orbit.enums.OrbitRoomStatus.CHECKOUT)
              and r.expiresAt <= :now
            """)
    List<OrbitRoom> findExpiredOpenRooms(@Param("now") OffsetDateTime now);

    java.util.Optional<OrbitRoom> findByBookingUuid(UUID bookingUuid);

    List<OrbitRoom> findByHostUserUuidAndStatusIn(UUID hostUserUuid, List<OrbitRoomStatus> statuses);

    Optional<OrbitRoom> findByUuidAndStatusIn(UUID uuid, List<OrbitRoomStatus> statuses);
}
