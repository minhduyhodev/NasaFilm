package com.thdpv.movietheater.user.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "user_favorite",
        uniqueConstraints = @UniqueConstraint(columnNames = { "user_uuid", "movie_uuid" }))
public class UserFavorite {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "movie_uuid", nullable = false)
    private UUID movieUuid;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public UserFavorite() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
