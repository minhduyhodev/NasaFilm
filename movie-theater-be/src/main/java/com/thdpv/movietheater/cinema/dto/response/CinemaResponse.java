package com.thdpv.movietheater.cinema.dto.response;

import java.util.UUID;

public class CinemaResponse {

    private UUID uuid;
    private String name;
    private String address;
    private String phoneNumber;
    private int totalRooms; // Helper field to show how many rooms this cinema has

    public CinemaResponse() {
    }

    public CinemaResponse(UUID uuid, String name, String address, String phoneNumber, int totalRooms) {
        this.uuid = uuid;
        this.name = name;
        this.address = address;
        this.phoneNumber = phoneNumber;
        this.totalRooms = totalRooms;
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

    public int getTotalRooms() {
        return totalRooms;
    }

    public void setTotalRooms(int totalRooms) {
        this.totalRooms = totalRooms;
    }
}
