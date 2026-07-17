package com.thdpv.movietheater.cinema.dto.response;

import java.util.List;
import java.util.UUID;
import com.thdpv.movietheater.cinema.enums.CinemaStatus;

public class CinemaWithRoomsResponse {

    private UUID uuid;
    private String name;
    private String address;
    private String phoneNumber;
    private String imageUrl;
    private int totalRooms;
    private List<CinemaRoomResponse> rooms;
    private CinemaStatus status;

    public CinemaWithRoomsResponse() {
    }

    public CinemaWithRoomsResponse(CinemaResponse cinema, List<CinemaRoomResponse> rooms) {
        this.uuid = cinema.getUuid();
        this.name = cinema.getName();
        this.address = cinema.getAddress();
        this.phoneNumber = cinema.getPhoneNumber();
        this.imageUrl = cinema.getImageUrl();
        this.totalRooms = cinema.getTotalRooms();
        this.rooms = rooms;
        this.status = cinema.getStatus();
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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public int getTotalRooms() {
        return totalRooms;
    }

    public void setTotalRooms(int totalRooms) {
        this.totalRooms = totalRooms;
    }

    public List<CinemaRoomResponse> getRooms() {
        return rooms;
    }

    public void setRooms(List<CinemaRoomResponse> rooms) {
        this.rooms = rooms;
    }

    public CinemaStatus getStatus() {
        return status;
    }

    public void setStatus(CinemaStatus status) {
        this.status = status;
    }
}
