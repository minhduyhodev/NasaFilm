package com.thdpv.movietheater.movie.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class MovieActorRequest {

    @NotNull(message = "Actor uuid khong duoc de trong")
    private UUID actorUuid;

    @Size(max = 255, message = "Ten vai dien khong duoc vuot qua 255 ky tu")
    private String characterName;

    @PositiveOrZero(message = "Thu tu dien vien khong hop le")
    private Integer castOrder;

    private Boolean isMain;

    public MovieActorRequest() {
    }

    public MovieActorRequest(UUID actorUuid, String characterName, Integer castOrder, Boolean isMain) {
        this.actorUuid = actorUuid;
        this.characterName = characterName;
        this.castOrder = castOrder;
        this.isMain = isMain;
    }

    public UUID getActorUuid() {
        return actorUuid;
    }

    public void setActorUuid(UUID actorUuid) {
        this.actorUuid = actorUuid;
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
