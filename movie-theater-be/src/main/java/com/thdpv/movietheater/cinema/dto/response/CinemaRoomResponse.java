package com.thdpv.movietheater.cinema.dto.response;

import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.enums.RoomType;
import java.util.UUID;

public class CinemaRoomResponse {

    private UUID uuid;
    private String roomCode;
    private String name;
    private Integer capacity;
    private RoomType roomType;
    private CinemaRoomStatus status;
    private UUID cinemaUuid;
    private String cinemaName;
    private String layoutConfig;

    public CinemaRoomResponse() {
    }

    public CinemaRoomResponse(UUID uuid, String roomCode, String name, Integer capacity, RoomType roomType, CinemaRoomStatus status, UUID cinemaUuid, String cinemaName, String layoutConfig) {
        this.uuid = uuid;
        this.roomCode = roomCode;
        this.name = name;
        this.capacity = capacity;
        this.roomType = roomType;
        this.status = status;
        this.cinemaUuid = cinemaUuid;
        this.cinemaName = cinemaName;
        this.layoutConfig = layoutConfig;
    }

    public CinemaRoomResponse(UUID uuid, String roomCode, String name, Integer capacity, RoomType roomType, CinemaRoomStatus status, UUID cinemaUuid, String cinemaName) {
        this(uuid, roomCode, name, capacity, roomType, status, cinemaUuid, cinemaName, null);
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
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

    public RoomType getRoomType() {
        return roomType;
    }

    public void setRoomType(RoomType roomType) {
        this.roomType = roomType;
    }

    public CinemaRoomStatus getStatus() {
        return status;
    }

    public void setStatus(CinemaRoomStatus status) {
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

    public String getLayoutConfig() {
        return layoutConfig;
    }

    public void setLayoutConfig(String layoutConfig) {
        this.layoutConfig = layoutConfig;
    }
}
