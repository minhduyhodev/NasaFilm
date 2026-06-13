package com.thdpv.movietheater.cinema.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.cinema.entity.Seat;

@Repository
public interface SeatRepository extends JpaRepository<Seat, UUID> {
    
    List<Seat> findByCinemaRoom_UuidOrderByRowNameAscSeatNumberAsc(UUID cinemaRoomUuid);

    long countByCinemaRoom_Uuid(UUID cinemaRoomUuid);

    @Modifying
    @Query("DELETE FROM Seat s WHERE s.cinemaRoom.uuid = :cinemaRoomUuid")
    void deleteByCinemaRoomUuid(UUID cinemaRoomUuid);
}
