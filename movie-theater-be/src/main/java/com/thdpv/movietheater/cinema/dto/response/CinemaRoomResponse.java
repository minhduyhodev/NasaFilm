package com.thdpv.movietheater.cinema.dto.response;

import java.util.UUID;

public class CinemaRoomResponse {

    private UUID uuid;
    private String name;
    private Integer capacity;
    private String status;
    private UUID cinemaUuid;
    private String cinemaName;

    public CinemaRoomResponse() {
    }

    public CinemaRoomResponse(UUID uuid, String name, Integer capacity, String status, UUID cinemaUuid, String cinemaName) {
        this.uuid = uuid;
        this.name = name;
        this.capacity = capacity;
        this.status = status;
        this.cinemaUuid = cinemaUuid;
        this.cinemaName = cinemaName;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getCinemaUuid() {
        return cinemaUuid;
    }

    public void setCinemaUuid(UUID cinemaUuid) {
        this.cinemaUuid = cinemaUuid;
    }

    public String getCinemaName() {
        return cinemaName;
    }

    public void setCinemaName(String cinemaName) {
        this.cinemaName = cinemaName;
    }
}
