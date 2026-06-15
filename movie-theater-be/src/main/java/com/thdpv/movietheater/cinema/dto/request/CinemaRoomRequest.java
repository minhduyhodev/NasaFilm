package com.thdpv.movietheater.cinema.dto.request;

import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.enums.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CinemaRoomRequest {

    @NotBlank(message = "Ma phong chieu khong duoc de trong")
    @Size(max = 50, message = "Ma phong chieu khong duoc vuot qua 50 ky tu")
    private String roomCode;

    @NotBlank(message = "Ten phong chieu khong duoc de trong")
    @Size(max = 255, message = "Ten phong chieu vuot qua ky tu cho phep")
    private String name;

    private Integer capacity;

    @NotNull(message = "Kieu phong chieu khong duoc de trong")
    private RoomType roomType;
    
    private CinemaRoomStatus status;

    public CinemaRoomRequest() {
    }

    public CinemaRoomRequest(String roomCode, String name, Integer capacity, RoomType roomType, CinemaRoomStatus status) {
        this.roomCode = roomCode;
        this.name = name;
        this.capacity = capacity;
        this.roomType = roomType;
        this.status = status;
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
}
