package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.booking.dto.response.SeatViewDto;
import com.thdpv.movietheater.booking.entity.Showtime;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, UUID> {

    @Query("""
            SELECT new com.thdpv.movietheater.booking.dto.response.SeatViewDto(
                st.uuid,
                st.cinemaRoomUuid,
                st.startTime,
                st.endTime,
                s.uuid,
                s.rowName,
                s.seatNumber,
                s.status,
                stt.uuid,
                stt.name,
                CASE 
                    WHEN UPPER(stt.name) = 'STANDARD' THEN st.basePrice
                    WHEN UPPER(stt.name) = 'VIP' THEN COALESCE(st.vipPrice, stt.basePrice)
                    WHEN UPPER(stt.name) = 'COUPLE' THEN COALESCE(st.couplePrice, stt.basePrice)
                    ELSE stt.basePrice
                END,
                COALESCE(stt.priceModifier, 1.0),
                bs.uuid,
                sl.userUuid,
                sl.expiredAt
            )
            FROM Showtime st
            JOIN Seat s ON s.cinemaRoom.uuid = st.cinemaRoomUuid
            JOIN SeatType stt ON stt.uuid = s.seatType.uuid
            LEFT JOIN BookingSeat bs
                ON bs.showtimeUuid = st.uuid
               AND bs.seatUuid = s.uuid
            LEFT JOIN SeatLocked sl
                ON sl.showtimeUuid = st.uuid
               AND sl.seatUuid = s.uuid
               AND sl.expiredAt > :now
            WHERE st.uuid = :showtimeUuid
            ORDER BY s.rowName ASC, s.seatNumber ASC
            """)
    List<SeatViewDto> getShowtimeSeatViews(@Param("showtimeUuid") UUID showtimeUuid, @Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(s) > 0 FROM Showtime s WHERE s.cinemaRoomUuid = :roomUuid AND s.startTime > :now")
    boolean existsFutureShowtime(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(b) > 0 FROM Booking b JOIN Showtime s ON s.uuid = b.showtimeUuid WHERE s.cinemaRoomUuid = :roomUuid AND b.status = 'CONFIRMED'")
    boolean existsConfirmedBookingForRoom(@Param("roomUuid") UUID roomUuid);

    @Query("SELECT COUNT(s) > 0 FROM Showtime s WHERE s.cinemaRoomUuid = :roomUuid AND s.startTime > :now AND (s.status = com.thdpv.movietheater.booking.enums.ShowtimeStatus.SCHEDULED OR s.status = com.thdpv.movietheater.booking.enums.ShowtimeStatus.OPEN_FOR_BOOKING)")
    boolean existsFutureActiveShowtimes(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoomUuid = :roomUuid AND s.uuid <> :excludeUuid AND s.status <> com.thdpv.movietheater.booking.enums.ShowtimeStatus.CANCELLED AND s.startTime < :endTimeWithBuffer AND s.endTime > :startTimeWithBuffer")
    List<Showtime> findOverlappingShowtimes(
        @Param("roomUuid") UUID roomUuid,
        @Param("excludeUuid") UUID excludeUuid,
        @Param("startTimeWithBuffer") OffsetDateTime startTimeWithBuffer,
        @Param("endTimeWithBuffer") OffsetDateTime endTimeWithBuffer
    );

    @Query("select count(s) from Showtime st join Seat s on s.cinemaRoom.uuid = st.cinemaRoomUuid where st.uuid = :showtimeUuid and s.uuid in :seatUuids")
    long countSeatsBelongingToShowtime(@Param("showtimeUuid") UUID showtimeUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Query("SELECT s FROM Showtime s WHERE s.cinemaRoomUuid IN :roomUuids AND s.startTime >= :startRange AND s.startTime < :endRange AND s.status <> com.thdpv.movietheater.booking.enums.ShowtimeStatus.CANCELLED")
    List<Showtime> findActiveShowtimesInRooms(
        @Param("roomUuids") Collection<UUID> roomUuids,
        @Param("startRange") OffsetDateTime startRange,
        @Param("endRange") OffsetDateTime endRange
    );
}
