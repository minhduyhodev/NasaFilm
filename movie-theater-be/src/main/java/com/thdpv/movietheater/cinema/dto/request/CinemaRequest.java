package com.thdpv.movietheater.cinema.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CinemaRequest {

    @NotBlank(message = "Ten rap khong duoc de trong")
    @Size(max = 255, message = "Ten rap vuot qua ky tu cho phep")
    private String name;

    @Size(max = 500, message = "Dia chi vuot qua ky tu cho phep")
    private String address;

    @Size(max = 20, message = "So dien thoai vuot qua ky tu cho phep")
    private String phoneNumber;

    public CinemaRequest() {
    }

    public CinemaRequest(String name, String address, String phoneNumber) {
        this.name = name;
        this.address = address;
        this.phoneNumber = phoneNumber;
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
}
