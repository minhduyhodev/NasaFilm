package com.thdpv.movietheater.movie.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.thdpv.movietheater.movie.enums.MovieReviewStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "movie_review",
        indexes = {
                @Index(name = "idx_movie_review_movie", columnList = "movie_uuid"),
                @Index(name = "idx_movie_review_user", columnList = "user_uuid"),
                @Index(name = "idx_movie_review_movie_user", columnList = "movie_uuid, user_uuid"),
                @Index(name = "idx_movie_review_movie_created", columnList = "movie_uuid, created_at")
        })
public class MovieReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "movie_uuid", nullable = false)
    private UUID movieUuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "vibe_tags", columnDefinition = "jsonb")
    private String vibeTags;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MovieReviewStatus status = MovieReviewStatus.VISIBLE;

    @Column(name = "moderated_by_uuid")
    private UUID moderatedByUuid;

    @Column(name = "moderated_at")
    private OffsetDateTime moderatedAt;

    @Column(name = "moderation_note", columnDefinition = "text")
    private String moderationNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public MovieReview() {
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

    public String getVibeTags() {
        return vibeTags;
    }

    public void setVibeTags(String vibeTags) {
        this.vibeTags = vibeTags;
    }

    public MovieReviewStatus getStatus() {
        return status;
    }

    public void setStatus(MovieReviewStatus status) {
        this.status = status;
    }

    public UUID getModeratedByUuid() {
        return moderatedByUuid;
    }

    public void setModeratedByUuid(UUID moderatedByUuid) {
        this.moderatedByUuid = moderatedByUuid;
    }

    public OffsetDateTime getModeratedAt() {
        return moderatedAt;
    }

    public void setModeratedAt(OffsetDateTime moderatedAt) {
        this.moderatedAt = moderatedAt;
    }

    public String getModerationNote() {
        return moderationNote;
    }

    public void setModerationNote(String moderationNote) {
        this.moderationNote = moderationNote;
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
}
