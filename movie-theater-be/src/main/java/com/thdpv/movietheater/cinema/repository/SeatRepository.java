package com.thdpv.movietheater.cinema.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import com.thdpv.movietheater.cinema.entity.Seat;
import com.thdpv.movietheater.cinema.enums.SeatStatus;

public interface SeatRepository extends JpaRepository<Seat, UUID> {
    
    List<Seat> findByCinemaRoom_UuidOrderByRowNameAscSeatNumberAsc(UUID cinemaRoomUuid);

    List<Seat> findByCinemaRoom_UuidAndIsActiveTrueOrderByRowNameAscSeatNumberAsc(UUID cinemaRoomUuid);

    long countByCinemaRoom_Uuid(UUID cinemaRoomUuid);

    /** Bookable seats = active + status ACTIVE (excludes DISABLED aisle/access seats and MAINTENANCE). */
    long countByCinemaRoom_UuidAndIsActiveTrueAndStatus(UUID cinemaRoomUuid, SeatStatus status);

    @Modifying
    @Query("DELETE FROM Seat s WHERE s.cinemaRoom.uuid = :cinemaRoomUuid")
    void deleteByCinemaRoomUuid(UUID cinemaRoomUuid);
}
