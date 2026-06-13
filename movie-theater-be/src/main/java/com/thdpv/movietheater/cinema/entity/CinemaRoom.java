package com.thdpv.movietheater.cinema.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.ConstraintMode;
import jakarta.persistence.Index;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;

@Entity
@Table(name = "cinema_room", indexes = {
        @Index(name = "idx_cinemaroom_cinema", columnList = "cinema_uuid")
})
public class CinemaRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "capacity")
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private CinemaRoomStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cinema_uuid", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Cinema cinema;

    @OneToMany(mappedBy = "cinemaRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Seat> seats = new ArrayList<>();

    public CinemaRoom() {
    }

    public CinemaRoom(UUID uuid, String name, Integer capacity, CinemaRoomStatus status, Cinema cinema) {
        this.uuid = uuid;
        this.name = name;
        this.capacity = capacity;
        this.status = status;
        this.cinema = cinema;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public CinemaRoomStatus getStatus() {
        return status;
    }

    public void setStatus(CinemaRoomStatus status) {
        this.status = status;
    }

    public Cinema getCinema() {
        return cinema;
    }

    public void setCinema(Cinema cinema) {
        this.cinema = cinema;
    }

    public List<Seat> getSeats() {
        return seats;
    }

    public void setSeats(List<Seat> seats) {
        this.seats = seats;
    }

    public void addSeat(Seat seat) {
        seats.add(seat);
        seat.setCinemaRoom(this);
    }
}
