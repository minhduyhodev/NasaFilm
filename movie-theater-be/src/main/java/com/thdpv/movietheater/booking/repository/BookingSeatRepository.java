package com.thdpv.movietheater.booking.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.BookingSeat;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
    void deleteByBookingUuid(UUID bookingUuid);
    long countByShowtimeUuid(UUID showtimeUuid);
}
