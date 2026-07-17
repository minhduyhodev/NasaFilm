package com.thdpv.movietheater.cinema.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.cinema.entity.CinemaRoom;

public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, UUID> {
    
    List<CinemaRoom> findByCinema_UuidOrderByNameAsc(UUID cinemaUuid);

    boolean existsByCinema_UuidAndNameIgnoreCase(UUID cinemaUuid, String name);

    boolean existsByCinema_UuidAndRoomCodeIgnoreCase(UUID cinemaUuid, String roomCode);

    boolean existsByCinema_UuidAndRoomCodeIgnoreCaseAndUuidNot(UUID cinemaUuid, String roomCode, UUID roomUuid);

    @Query("SELECT DISTINCT r FROM CinemaRoom r JOIN FETCH r.cinema WHERE r.uuid IN :uuids")
    List<CinemaRoom> findAllByIdWithCinema(@Param("uuids") Collection<UUID> uuids);

    @Query("SELECT r.cinema.uuid AS cinemaUuid, COUNT(r) AS roomCount FROM CinemaRoom r WHERE r.cinema.uuid IN :cinemaUuids GROUP BY r.cinema.uuid")
    List<Object[]> countRoomsByCinemaUuids(@Param("cinemaUuids") Collection<UUID> cinemaUuids);

    @Query("SELECT DISTINCT r FROM CinemaRoom r JOIN FETCH r.cinema WHERE r.cinema.uuid IN :cinemaUuids ORDER BY r.name ASC")
    List<CinemaRoom> findByCinemaUuidInWithCinema(@Param("cinemaUuids") Collection<UUID> cinemaUuids);
}
