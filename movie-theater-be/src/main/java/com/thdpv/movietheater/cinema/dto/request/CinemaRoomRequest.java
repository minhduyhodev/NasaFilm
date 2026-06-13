package com.thdpv.movietheater.cinema.dto.request;

import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CinemaRoomRequest {

    @NotBlank(message = "Ten phong chieu khong duoc de trong")
    @Size(max = 255, message = "Ten phong chieu vuot qua ky tu cho phep")
    private String name;

    private Integer capacity;
    
    private CinemaRoomStatus status;

    public CinemaRoomRequest() {
    }

    public CinemaRoomRequest(String name, Integer capacity, CinemaRoomStatus status) {
        this.name = name;
        this.capacity = capacity;
        this.status = status;
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
}
