package com.thdpv.movietheater.movie.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ActorRequest {

    @NotBlank(message = "Ten dien vien khong duoc de trong")
    @Size(max = 255, message = "Ten dien vien khong duoc vuot qua 255 ky tu")
    private String fullName;

    @Size(max = 1000, message = "Avatar URL khong duoc vuot qua 1000 ky tu")
    private String avatarUrl;

    private UUID countryUuid;

    public ActorRequest() {
    }

    public ActorRequest(String fullName, String avatarUrl, UUID countryUuid) {
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.countryUuid = countryUuid;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public UUID getCountryUuid() {
        return countryUuid;
    }

    public void setCountryUuid(UUID countryUuid) {
        this.countryUuid = countryUuid;
    }
}
