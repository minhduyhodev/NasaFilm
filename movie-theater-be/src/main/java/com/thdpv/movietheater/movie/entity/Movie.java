package com.thdpv.movietheater.movie.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "movie")
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "status")
    private String status;

    @Column(name = "age_restriction")
    private String ageRestriction;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "streaming_url")
    private String streamingUrl;

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<MovieGenre> movieGenres = new ArrayList<>();

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<MovieCountry> movieCountries = new ArrayList<>();

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 20)
    @OrderBy("castOrder ASC")
    private List<MovieActor> movieActors = new ArrayList<>();

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 20)
    @OrderBy("sortOrder ASC")
    private List<MovieMedia> movieMedias = new ArrayList<>();

    public Movie() {
    }

    public Movie(UUID uuid, String title, String description, Integer durationMinutes, LocalDate releaseDate,
            String status, String ageRestriction, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            List<MovieGenre> movieGenres,
            List<MovieCountry> movieCountries, List<MovieActor> movieActors, List<MovieMedia> movieMedias) {
        this.uuid = uuid;
        this.title = title;
        this.description = description;
        this.durationMinutes = durationMinutes;
        this.releaseDate = releaseDate;
        this.status = status;
        this.ageRestriction = ageRestriction;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.movieGenres = movieGenres != null ? movieGenres : new ArrayList<>();
        this.movieCountries = movieCountries != null ? movieCountries : new ArrayList<>();
        this.movieActors = movieActors != null ? movieActors : new ArrayList<>();
        this.movieMedias = movieMedias != null ? movieMedias : new ArrayList<>();
    }

    public void addMovieGenre(MovieGenre movieGenre) {
        movieGenres.add(movieGenre);
        movieGenre.setMovie(this);
    }

    public void addMovieCountry(MovieCountry movieCountry) {
        movieCountries.add(movieCountry);
        movieCountry.setMovie(this);
    }

    public void addMovieActor(MovieActor movieActor) {
        movieActors.add(movieActor);
        movieActor.setMovie(this);
    }

    public void addMovieMedia(MovieMedia movieMedia) {
        movieMedias.add(movieMedia);
        movieMedia.setMovie(this);
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public LocalDate getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(LocalDate releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAgeRestriction() {
        return ageRestriction;
    }

    public void setAgeRestriction(String ageRestriction) {
        this.ageRestriction = ageRestriction;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<MovieGenre> getMovieGenres() {
        return movieGenres;
    }

    public void setMovieGenres(List<MovieGenre> movieGenres) {
        this.movieGenres = movieGenres;
    }

    public List<MovieCountry> getMovieCountries() {
        return movieCountries;
    }

    public void setMovieCountries(List<MovieCountry> movieCountries) {
        this.movieCountries = movieCountries;
    }

    public List<MovieActor> getMovieActors() {
        return movieActors;
    }

    public void setMovieActors(List<MovieActor> movieActors) {
        this.movieActors = movieActors;
    }

    public List<MovieMedia> getMovieMedias() {
        return movieMedias;
    }

    public void setMovieMedias(List<MovieMedia> movieMedias) {
        this.movieMedias = movieMedias;
    }

    public String getStreamingUrl() {
        return streamingUrl;
    }

    public void setStreamingUrl(String streamingUrl) {
        this.streamingUrl = streamingUrl;
    }

}
