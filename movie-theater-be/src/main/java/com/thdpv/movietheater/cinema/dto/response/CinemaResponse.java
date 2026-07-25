package com.thdpv.movietheater.cinema.dto.response;

import java.util.UUID;
import com.thdpv.movietheater.cinema.enums.CinemaStatus;

public class CinemaResponse {

    private UUID uuid;
    private String name;
    private String address;
    private String phoneNumber;
    private String entranceNote;
    private String imageUrl;
    private Double latitude;
    private Double longitude;
    private int totalRooms; // Helper field to show how many rooms this cinema has
    private CinemaStatus status;

    public CinemaResponse() {
    }

    public CinemaResponse(UUID uuid, String name, String address, String phoneNumber, int totalRooms) {
        this.uuid = uuid;
        this.name = name;
        this.address = address;
        this.phoneNumber = phoneNumber;
        this.totalRooms = totalRooms;
    }

    public CinemaResponse(UUID uuid, String name, String address, String phoneNumber, int totalRooms, CinemaStatus status) {
        this.uuid = uuid;
        this.name = name;
        this.address = address;
        this.phoneNumber = phoneNumber;
        this.totalRooms = totalRooms;
        this.status = status;
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

    public String getEntranceNote() {
        return entranceNote;
    }

    public void setEntranceNote(String entranceNote) {
        this.entranceNote = entranceNote;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public int getTotalRooms() {
        return totalRooms;
    }

    public void setTotalRooms(int totalRooms) {
        this.totalRooms = totalRooms;
    }

    public CinemaStatus getStatus() {
        return status;
    }

    public void setStatus(CinemaStatus status) {
        this.status = status;
    }
}
