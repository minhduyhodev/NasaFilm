package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CountryRequest {

    @NotBlank(message = "Ma quoc gia khong duoc de trong")
    @Size(max = 10, message = "Ma quoc gia khong duoc vuot qua 10 ky tu")
    private String code;

    @NotBlank(message = "Ten quoc gia khong duoc de trong")
    @Size(max = 100, message = "Ten quoc gia khong duoc vuot qua 100 ky tu")
    private String name;

    public CountryRequest() {
    }

    public CountryRequest(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
