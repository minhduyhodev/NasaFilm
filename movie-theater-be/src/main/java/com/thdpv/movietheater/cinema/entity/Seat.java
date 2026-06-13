package com.thdpv.movietheater.cinema.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.ConstraintMode;
import jakarta.persistence.Index;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import com.thdpv.movietheater.cinema.enums.SeatStatus;

@Entity
@Table(
        name = "seat",
        indexes = {
                @Index(name = "idx_seat_seattype", columnList = "seat_type_uuid")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_seat_room_row_number", columnNames = {"cinema_room_uuid", "row_name", "seat_number"})
        }
)
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cinema_room_uuid", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private CinemaRoom cinemaRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_type_uuid", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private SeatType seatType;

    @Column(name = "row_name", nullable = false)
    private String rowName;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private SeatStatus status;

    public Seat() {
    }

    public Seat(UUID uuid, CinemaRoom cinemaRoom, SeatType seatType, String rowName, Integer seatNumber, SeatStatus status) {
        this.uuid = uuid;
        this.cinemaRoom = cinemaRoom;
        this.seatType = seatType;
        this.rowName = rowName;
        this.seatNumber = seatNumber;
        this.status = status;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public CinemaRoom getCinemaRoom() {
        return cinemaRoom;
    }

    public void setCinemaRoom(CinemaRoom cinemaRoom) {
        this.cinemaRoom = cinemaRoom;
    }

    public SeatType getSeatType() {
        return seatType;
    }

    public void setSeatType(SeatType seatType) {
        this.seatType = seatType;
    }

    public String getRowName() {
        return rowName;
    }

    public void setRowName(String rowName) {
        this.rowName = rowName;
    }

    public Integer getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(Integer seatNumber) {
        this.seatNumber = seatNumber;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }
}
