package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.booking.entity.SeatLocked;

@Repository
public interface SeatLockedRepository extends JpaRepository<SeatLocked, UUID> {

    @Modifying
    @Query("delete from SeatLocked sl where sl.showtimeUuid = :showtimeUuid and sl.expiredAt <= :now")
    void deleteExpiredLocks(@Param("showtimeUuid") UUID showtimeUuid, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("delete from SeatLocked sl where sl.expiredAt <= :now")
    void deleteExpiredLocksScheduled(@Param("now") OffsetDateTime now);

    @Query("select count(sl) from SeatLocked sl where sl.showtimeUuid = :showtimeUuid and sl.seatUuid in :seatUuids and sl.userUuid <> :userUuid and sl.expiredAt > :now")
    long countLockedByOther(@Param("showtimeUuid") UUID showtimeUuid, @Param("seatUuids") Collection<UUID> seatUuids, @Param("userUuid") UUID userUuid, @Param("now") OffsetDateTime now);

    @Query("select sl.seatUuid from SeatLocked sl where sl.showtimeUuid = :showtimeUuid and sl.userUuid = :userUuid and sl.expiredAt > :now")
    List<UUID> findLockedSeatUuids(@Param("showtimeUuid") UUID showtimeUuid, @Param("userUuid") UUID userUuid, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("delete from SeatLocked sl where sl.showtimeUuid = :showtimeUuid and sl.userUuid = :userUuid and sl.seatUuid in :seatUuids")
    void releaseSeatLocks(@Param("showtimeUuid") UUID showtimeUuid, @Param("userUuid") UUID userUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Modifying
    @Query("update SeatLocked sl set sl.lockedAt = :now, sl.expiredAt = :expiresAt where sl.showtimeUuid = :showtimeUuid and sl.userUuid = :userUuid and sl.seatUuid in :seatUuids")
    void refreshSeatLocks(@Param("showtimeUuid") UUID showtimeUuid, @Param("userUuid") UUID userUuid, @Param("seatUuids") Collection<UUID> seatUuids, @Param("now") OffsetDateTime now, @Param("expiresAt") OffsetDateTime expiresAt);
}
