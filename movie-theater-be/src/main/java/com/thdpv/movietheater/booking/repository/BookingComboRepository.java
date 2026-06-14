package com.thdpv.movietheater.booking.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.BookingCombo;

public interface BookingComboRepository extends JpaRepository<BookingCombo, UUID> {
    void deleteByBookingUuid(UUID bookingUuid);
}
