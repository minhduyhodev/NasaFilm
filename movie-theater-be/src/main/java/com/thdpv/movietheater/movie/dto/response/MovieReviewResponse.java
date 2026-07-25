package com.thdpv.movietheater.movie.dto.response;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.thdpv.movietheater.mission.dto.response.MissionCompletionResponse;

public class MovieReviewResponse {

    private UUID uuid;
    private UUID movieUuid;
    private UUID userUuid;
    private String userFullName;
    private String userAvatarUrl;
    private int rating;
    private String comment;
    private List<String> vibeTags = new ArrayList<>();
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private boolean mine;
    private boolean reportedByMe;
    private List<MissionCompletionResponse> missionCompletions = new ArrayList<>();

    public MovieReviewResponse() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getUserAvatarUrl() {
        return userAvatarUrl;
    }

    public void setUserAvatarUrl(String userAvatarUrl) {
        this.userAvatarUrl = userAvatarUrl;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public List<String> getVibeTags() {
        return vibeTags;
    }

    public void setVibeTags(List<String> vibeTags) {
        this.vibeTags = vibeTags;
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

    public boolean isMine() {
        return mine;
    }

    public void setMine(boolean mine) {
        this.mine = mine;
    }

    public boolean isReportedByMe() {
        return reportedByMe;
    }

    public void setReportedByMe(boolean reportedByMe) {
        this.reportedByMe = reportedByMe;
    }

    public List<MissionCompletionResponse> getMissionCompletions() {
        return missionCompletions;
    }

    public void setMissionCompletions(List<MissionCompletionResponse> missionCompletions) {
        this.missionCompletions = missionCompletions != null ? missionCompletions : new ArrayList<>();
    }
}
