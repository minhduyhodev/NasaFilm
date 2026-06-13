package com.thdpv.movietheater.cinema.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.cinema.entity.CinemaRoom;

@Repository
public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, UUID> {
    
    List<CinemaRoom> findByCinema_UuidOrderByNameAsc(UUID cinemaUuid);

    boolean existsByCinema_UuidAndNameIgnoreCase(UUID cinemaUuid, String name);
}
