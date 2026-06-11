package com.thdpv.movietheater.movie.dto.response;

import java.util.UUID;

public class ActorResponse {

    private UUID uuid;
    private String fullName;
    private String avatarUrl;
    private String countryName;
    private String characterName;
    private Integer castOrder;
    private Boolean isMain;

    public ActorResponse() {
    }

    public ActorResponse(UUID uuid, String fullName, String avatarUrl, String countryName, String characterName,
            Integer castOrder, Boolean isMain) {
        this.uuid = uuid;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.countryName = countryName;
        this.characterName = characterName;
        this.castOrder = castOrder;
        this.isMain = isMain;
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

    public String getCountryName() {
        return countryName;
    }

    public void setCountryName(String countryName) {
        this.countryName = countryName;
    }

    public String getCharacterName() {
        return characterName;
    }

    public void setCharacterName(String characterName) {
        this.characterName = characterName;
    }

    public Integer getCastOrder() {
        return castOrder;
    }

    public void setCastOrder(Integer castOrder) {
        this.castOrder = castOrder;
    }

    public Boolean getIsMain() {
        return isMain;
    }

    public void setIsMain(Boolean isMain) {
        this.isMain = isMain;
    }
}
