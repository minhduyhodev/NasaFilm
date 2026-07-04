package com.thdpv.movietheater.discover.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_matchmaker_history")
public class UserMatchmakerHistory {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid")
    private UUID userUuid;

    @Column(name = "mood", nullable = false, length = 32)
    private String mood;

    @Column(name = "duration", nullable = false, length = 16)
    private String duration;

    @Column(name = "viewing_location", nullable = false, length = 16)
    private String viewingLocation;

    @Column(name = "genre_uuids", columnDefinition = "text")
    private String genreUuids;

    @Column(name = "use_history", nullable = false)
    private boolean useHistory;

    @Column(name = "flight_code", length = 32)
    private String flightCode;

    @Column(name = "match_count", nullable = false)
    private int matchCount;

    @Column(name = "matched_movie_uuids", columnDefinition = "text")
    private String matchedMovieUuids;

    @Column(name = "top_match_movie_uuid")
    private UUID topMatchMovieUuid;

    @Column(name = "top_match_score")
    private Integer topMatchScore;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

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

    public String getMood() {
        return mood;
    }

    public void setMood(String mood) {
        this.mood = mood;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public String getViewingLocation() {
        return viewingLocation;
    }

    public void setViewingLocation(String viewingLocation) {
        this.viewingLocation = viewingLocation;
    }

    public String getGenreUuids() {
        return genreUuids;
    }

    public void setGenreUuids(String genreUuids) {
        this.genreUuids = genreUuids;
    }

    public boolean isUseHistory() {
        return useHistory;
    }

    public void setUseHistory(boolean useHistory) {
        this.useHistory = useHistory;
    }

    public String getFlightCode() {
        return flightCode;
    }

    public void setFlightCode(String flightCode) {
        this.flightCode = flightCode;
    }

    public int getMatchCount() {
        return matchCount;
    }

    public void setMatchCount(int matchCount) {
        this.matchCount = matchCount;
    }

    public String getMatchedMovieUuids() {
        return matchedMovieUuids;
    }

    public void setMatchedMovieUuids(String matchedMovieUuids) {
        this.matchedMovieUuids = matchedMovieUuids;
    }

    public UUID getTopMatchMovieUuid() {
        return topMatchMovieUuid;
    }

    public void setTopMatchMovieUuid(UUID topMatchMovieUuid) {
        this.topMatchMovieUuid = topMatchMovieUuid;
    }

    public Integer getTopMatchScore() {
        return topMatchScore;
    }

    public void setTopMatchScore(Integer topMatchScore) {
        this.topMatchScore = topMatchScore;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
