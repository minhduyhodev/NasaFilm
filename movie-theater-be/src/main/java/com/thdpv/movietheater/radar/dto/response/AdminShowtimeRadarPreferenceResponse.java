package com.thdpv.movietheater.radar.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminShowtimeRadarPreferenceResponse {

    private UUID userUuid;
    private String userEmail;
    private String userFullName;
    private boolean enabled;
    private List<UUID> genreUuids;
    private List<String> genreNames;
    private Integer timeSlotStartHour;
    private Integer timeSlotEndHour;
    private boolean includeFavorites;
    private OffsetDateTime updatedAt;
}
