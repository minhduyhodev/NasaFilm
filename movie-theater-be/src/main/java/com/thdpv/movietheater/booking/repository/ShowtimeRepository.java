package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
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
                stt.basePrice,
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

}
