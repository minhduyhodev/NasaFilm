package com.thdpv.movietheater.booking.repository;

import java.util.Collection;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.BookingSeat;
import com.thdpv.movietheater.cinema.entity.Seat;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
    void deleteByBookingUuid(UUID bookingUuid);
    long countByShowtimeUuid(UUID showtimeUuid);
    java.util.List<BookingSeat> findByBookingUuid(UUID bookingUuid);

    @Query("select count(bs) from BookingSeat bs where bs.showtimeUuid = :showtimeUuid and bs.seatUuid in :seatUuids")
    long countBookedSeats(@Param("showtimeUuid") UUID showtimeUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Query("""
            SELECT s FROM Seat s
            WHERE s.uuid IN (
                SELECT bs.seatUuid FROM BookingSeat bs WHERE bs.bookingUuid = :bookingUuid
            )
            ORDER BY s.rowName ASC, s.seatNumber ASC
            """)
    java.util.List<Seat> findSeatsByBookingUuid(@Param("bookingUuid") UUID bookingUuid);
}
