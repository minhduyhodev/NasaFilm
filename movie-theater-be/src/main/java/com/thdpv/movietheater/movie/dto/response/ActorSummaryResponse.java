package com.thdpv.movietheater.movie.dto.response;

import java.util.UUID;

public class ActorSummaryResponse {

    private UUID uuid;
    private String fullName;
    private String avatarUrl;
    private UUID countryUuid;
    private String countryName;
    private String countryCode;

    public ActorSummaryResponse() {
    }

    public ActorSummaryResponse(UUID uuid, String fullName, String avatarUrl, UUID countryUuid, String countryName) {
        this(uuid, fullName, avatarUrl, countryUuid, countryName, null);
    }

    public ActorSummaryResponse(UUID uuid, String fullName, String avatarUrl, UUID countryUuid, String countryName,
            String countryCode) {
        this.uuid = uuid;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.countryUuid = countryUuid;
        this.countryName = countryName;
        this.countryCode = countryCode;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
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

    public String getCountryName() {
        return countryName;
    }

    public void setCountryName(String countryName) {
        this.countryName = countryName;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }
}
