package com.thdpv.movietheater.cinema.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CinemaRoomRequest {

    @NotBlank(message = "Ten phong chieu khong duoc de trong")
    @Size(max = 255, message = "Ten phong chieu vuot qua ky tu cho phep")
    private String name;

    private Integer capacity;
    
    private String status;

    public CinemaRoomRequest() {
    }

    public CinemaRoomRequest(String name, Integer capacity, String status) {
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
