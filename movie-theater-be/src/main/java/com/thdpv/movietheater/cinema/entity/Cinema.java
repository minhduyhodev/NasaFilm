package com.thdpv.movietheater.cinema.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "cinema")
public class Cinema {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "address")
    private String address;

    @Column(name = "phone_number")
    private String phoneNumber;

    @OneToMany(mappedBy = "cinema", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CinemaRoom> cinemaRooms = new ArrayList<>();

    public Cinema() {
    }

    public Cinema(UUID uuid, String name, String address, String phoneNumber) {
        this.uuid = uuid;
        this.name = name;
        this.address = address;
        this.phoneNumber = phoneNumber;
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

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public List<CinemaRoom> getCinemaRooms() {
        return cinemaRooms;
    }

    public void setCinemaRooms(List<CinemaRoom> cinemaRooms) {
        this.cinemaRooms = cinemaRooms;
    }
    
    public void addCinemaRoom(CinemaRoom room) {
        cinemaRooms.add(room);
        room.setCinema(this);
    }
}
