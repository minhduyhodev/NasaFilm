package com.thdpv.movietheater.mission.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.mission.enums.MissionEventType;

public class MissionEventPayload {

    private final UUID userUuid;
    private final MissionEventType eventType;
    private final String sourceId;
    private final UUID movieUuid;
    private final UUID reviewUuid;
    private final OffsetDateTime occurredAt;

    private MissionEventPayload(
            UUID userUuid,
            MissionEventType eventType,
            String sourceId,
            UUID movieUuid,
            UUID reviewUuid,
            OffsetDateTime occurredAt) {
        this.userUuid = userUuid;
        this.eventType = eventType;
        this.sourceId = sourceId;
        this.movieUuid = movieUuid;
        this.reviewUuid = reviewUuid;
        this.occurredAt = occurredAt;
    }

    public static MissionEventPayload theaterBooking(UUID userUuid, UUID bookingUuid, UUID movieUuid, OffsetDateTime at) {
        return new MissionEventPayload(
                userUuid,
                MissionEventType.THEATER_BOOKING_CONFIRMED,
                bookingUuid.toString(),
                movieUuid,
                null,
                at);
    }

    public static MissionEventPayload vodPurchase(UUID userUuid, UUID bookingUuid, UUID movieUuid, OffsetDateTime at) {
        return new MissionEventPayload(
                userUuid,
                MissionEventType.VOD_PURCHASE_CONFIRMED,
                bookingUuid.toString(),
                movieUuid,
                null,
                at);
    }

    public static MissionEventPayload vodFirstPlay(UUID userUuid, UUID bookingUuid, UUID movieUuid, OffsetDateTime at) {
        return new MissionEventPayload(
                userUuid,
                MissionEventType.VOD_FIRST_PLAY,
                bookingUuid.toString(),
                movieUuid,
                null,
                at);
    }

    public static MissionEventPayload reviewWithVibeTag(
            UUID userUuid, UUID reviewUuid, UUID movieUuid, OffsetDateTime at) {
        return new MissionEventPayload(
                userUuid,
                MissionEventType.REVIEW_WITH_VIBE_TAG_CREATED,
                reviewUuid.toString(),
                movieUuid,
                reviewUuid,
                at);
    }

    public static MissionEventPayload orbitRoomJoined(UUID userUuid, UUID roomUuid, OffsetDateTime at) {
        return new MissionEventPayload(
                userUuid,
                MissionEventType.ORBIT_ROOM_JOINED,
                roomUuid.toString(),
                null,
                null,
                at);
    }

    public static MissionEventPayload discoverQuizCompleted(UUID userUuid, UUID sessionUuid, OffsetDateTime at) {
        return new MissionEventPayload(
                userUuid,
                MissionEventType.DISCOVER_QUIZ_COMPLETED,
                sessionUuid.toString(),
                null,
                null,
                at);
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public MissionEventType getEventType() {
        return eventType;
    }

    public String getSourceId() {
        return sourceId;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public UUID getReviewUuid() {
        return reviewUuid;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }
}
