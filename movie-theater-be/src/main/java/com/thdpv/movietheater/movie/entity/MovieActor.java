package com.thdpv.movietheater.movie.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "movie_actor",
        indexes = {
                @Index(name = "idx_movieactor_actor", columnList = "actor_uuid"),
                @Index(name = "idx_movieactor_movie_actor_character", columnList = "movie_uuid, actor_uuid, character_name")
        })
public class MovieActor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_uuid", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_uuid", nullable = false)
    private Actor actor;

    @Column(name = "character_name")
    private String characterName;

    @Column(name = "cast_order")
    private Integer castOrder;

    @Column(name = "is_main")
    private Boolean isMain;

    public MovieActor() {
    }

    public MovieActor(UUID uuid, Movie movie, Actor actor, String characterName, Integer castOrder, Boolean isMain) {
        this.uuid = uuid;
        this.movie = movie;
        this.actor = actor;
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

    public Movie getMovie() {
        return movie;
    }

    public void setMovie(Movie movie) {
        this.movie = movie;
    }

    public Actor getActor() {
        return actor;
    }

    public void setActor(Actor actor) {
        this.actor = actor;
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
