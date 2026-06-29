package com.thdpv.movietheater.movie.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.movie.enums.MovieReviewReportStatus;

public class MovieReviewReportResponse {

    private UUID uuid;
    private UUID reviewUuid;
    private UUID movieUuid;
    private String movieTitle;
    private UUID reporterUuid;
    private String reporterFullName;
    private UUID reviewUserUuid;
    private String reviewUserFullName;
    private int reviewRating;
    private String reviewComment;
    private String reason;
    private MovieReviewReportStatus status;
    private String resolutionNote;
    private UUID resolvedByUuid;
    private String resolvedByFullName;
    private OffsetDateTime resolvedAt;
    private OffsetDateTime createdAt;

    public MovieReviewReportResponse() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getReviewUuid() {
        return reviewUuid;
    }

    public void setReviewUuid(UUID reviewUuid) {
        this.reviewUuid = reviewUuid;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public UUID getReporterUuid() {
        return reporterUuid;
    }

    public void setReporterUuid(UUID reporterUuid) {
        this.reporterUuid = reporterUuid;
    }

    public String getReporterFullName() {
        return reporterFullName;
    }

    public void setReporterFullName(String reporterFullName) {
        this.reporterFullName = reporterFullName;
    }

    public UUID getReviewUserUuid() {
        return reviewUserUuid;
    }

    public void setReviewUserUuid(UUID reviewUserUuid) {
        this.reviewUserUuid = reviewUserUuid;
    }

    public String getReviewUserFullName() {
        return reviewUserFullName;
    }

    public void setReviewUserFullName(String reviewUserFullName) {
        this.reviewUserFullName = reviewUserFullName;
    }

    public int getReviewRating() {
        return reviewRating;
    }

    public void setReviewRating(int reviewRating) {
        this.reviewRating = reviewRating;
    }

    public String getReviewComment() {
        return reviewComment;
    }

    public void setReviewComment(String reviewComment) {
        this.reviewComment = reviewComment;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public MovieReviewReportStatus getStatus() {
        return status;
    }

    public void setStatus(MovieReviewReportStatus status) {
        this.status = status;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }

    public UUID getResolvedByUuid() {
        return resolvedByUuid;
    }

    public void setResolvedByUuid(UUID resolvedByUuid) {
        this.resolvedByUuid = resolvedByUuid;
    }

    public String getResolvedByFullName() {
        return resolvedByFullName;
    }

    public void setResolvedByFullName(String resolvedByFullName) {
        this.resolvedByFullName = resolvedByFullName;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(OffsetDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
