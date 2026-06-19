package com.thdpv.movietheater.movie.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;

public class MovieFilterRequest {
    private String keyword;
    private String status;
    private List<UUID> genreUuids;
    private UUID countryUuid;
    private String ageRestriction;
    private UUID actorUuid;
    private UUID cinemaUuid;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate showtimeDate;

    public MovieFilterRequest() {
    }

    public MovieFilterRequest(String keyword, String status, List<UUID> genreUuids, UUID countryUuid,
                              String ageRestriction, UUID actorUuid, UUID cinemaUuid, LocalDate showtimeDate) {
        this.keyword = keyword;
        this.status = status;
        this.genreUuids = genreUuids;
        this.countryUuid = countryUuid;
        this.ageRestriction = ageRestriction;
        this.actorUuid = actorUuid;
        this.cinemaUuid = cinemaUuid;
        this.showtimeDate = showtimeDate;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<UUID> getGenreUuids() {
        return genreUuids;
    }

    public void setGenreUuids(List<UUID> genreUuids) {
        this.genreUuids = genreUuids;
    }

    public UUID getCountryUuid() {
        return countryUuid;
    }

    public void setCountryUuid(UUID countryUuid) {
        this.countryUuid = countryUuid;
    }

    public String getAgeRestriction() {
        return ageRestriction;
    }

    public void setAgeRestriction(String ageRestriction) {
        this.ageRestriction = ageRestriction;
    }

    public UUID getActorUuid() {
        return actorUuid;
    }

    public void setActorUuid(UUID actorUuid) {
        this.actorUuid = actorUuid;
    }

    public UUID getCinemaUuid() {
        return cinemaUuid;
    }

    public void setCinemaUuid(UUID cinemaUuid) {
        this.cinemaUuid = cinemaUuid;
    }

    public LocalDate getShowtimeDate() {
        return showtimeDate;
    }

    public void setShowtimeDate(LocalDate showtimeDate) {
        this.showtimeDate = showtimeDate;
    }
}
