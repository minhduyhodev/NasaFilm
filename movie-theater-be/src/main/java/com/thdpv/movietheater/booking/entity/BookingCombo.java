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
        name = "booking_combo",
        indexes = {
                @Index(name = "idx_bookingcombo_combo", columnList = "combo_uuid")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_bookingcombo_booking_combo", columnNames = {"booking_uuid", "combo_uuid"})
        })
public class BookingCombo {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "booking_uuid", nullable = false)
    private UUID bookingUuid;

    @Column(name = "combo_uuid", nullable = false)
    private UUID comboUuid;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    public BookingCombo() {
    }

    public BookingCombo(UUID uuid, UUID bookingUuid, UUID comboUuid, Integer quantity, BigDecimal price) {
        this.uuid = uuid;
        this.bookingUuid = bookingUuid;
        this.comboUuid = comboUuid;
        this.quantity = quantity;
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

    public UUID getComboUuid() {
        return comboUuid;
    }

    public void setComboUuid(UUID comboUuid) {
        this.comboUuid = comboUuid;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
