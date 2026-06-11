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
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "movie_genre",
        indexes = {
                @Index(name = "idx_moviegenre_genre", columnList = "genre_uuid")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_moviegenre_movie_genre", columnNames = { "movie_uuid", "genre_uuid" })
        })
public class MovieGenre {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_uuid", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "genre_uuid", nullable = false)
    private Genre genre;

    public MovieGenre() {
    }

    public MovieGenre(UUID uuid, Movie movie, Genre genre) {
        this.uuid = uuid;
        this.movie = movie;
        this.genre = genre;
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

    public Genre getGenre() {
        return genre;
    }

    public void setGenre(Genre genre) {
        this.genre = genre;
    }
}
