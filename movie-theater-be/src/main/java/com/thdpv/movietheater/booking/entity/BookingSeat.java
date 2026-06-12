package com.thdpv.movietheater.booking.entity;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "booking_seat",
        indexes = {
                @Index(name = "idx_bookingseat_booking", columnList = "booking_uuid"),
                @Index(name = "idx_bookingseat_seat", columnList = "seat_uuid")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_bookingseat_showtime_seat", columnNames = {"showtime_uuid", "seat_uuid"})
        })
public class BookingSeat {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "booking_uuid", nullable = false)
    private UUID bookingUuid;

    @Column(name = "showtime_uuid", nullable = false)
    private UUID showtimeUuid;

    @Column(name = "seat_uuid", nullable = false)
    private UUID seatUuid;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    public BookingSeat() {
    }

    public BookingSeat(UUID uuid, UUID bookingUuid, UUID showtimeUuid, UUID seatUuid, BigDecimal price) {
        this.uuid = uuid;
        this.bookingUuid = bookingUuid;
        this.showtimeUuid = showtimeUuid;
        this.seatUuid = seatUuid;
        this.price = price;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public UUID getSeatUuid() {
        return seatUuid;
    }

    public void setSeatUuid(UUID seatUuid) {
        this.seatUuid = seatUuid;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
