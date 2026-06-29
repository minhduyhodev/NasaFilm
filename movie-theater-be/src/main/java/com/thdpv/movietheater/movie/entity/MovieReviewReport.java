package com.thdpv.movietheater.movie.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import com.thdpv.movietheater.movie.enums.MovieReviewReportStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "movie_review_report",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_movie_review_report_review_reporter",
                        columnNames = { "review_uuid", "reporter_uuid" })
        },
        indexes = {
                @Index(name = "idx_movie_review_report_status", columnList = "status"),
                @Index(name = "idx_movie_review_report_review", columnList = "review_uuid")
        })
public class MovieReviewReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "review_uuid", nullable = false)
    private UUID reviewUuid;

    @Column(name = "reporter_uuid", nullable = false)
    private UUID reporterUuid;

    @Column(name = "reason", nullable = false, columnDefinition = "text")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MovieReviewReportStatus status = MovieReviewReportStatus.PENDING;

    @Column(name = "resolved_by_uuid")
    private UUID resolvedByUuid;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "resolution_note", columnDefinition = "text")
    private String resolutionNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    public MovieReviewReport() {
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

    public UUID getReporterUuid() {
        return reporterUuid;
    }

    public void setReporterUuid(UUID reporterUuid) {
        this.reporterUuid = reporterUuid;
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

    public UUID getResolvedByUuid() {
        return resolvedByUuid;
    }

    public void setResolvedByUuid(UUID resolvedByUuid) {
        this.resolvedByUuid = resolvedByUuid;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(OffsetDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
