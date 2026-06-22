package com.thdpv.movietheater.booking.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.Booking;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    boolean existsByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    long countByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);
    List<Booking> findByShowtimeUuid(UUID showtimeUuid);
    java.util.Optional<Booking> findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(UUID userUuid, UUID movieUuid, String bookingType, String status);
    List<Booking> findByUserUuidAndBookingTypeAndStatus(UUID userUuid, String bookingType, String status);
}
