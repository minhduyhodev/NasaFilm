package com.thdpv.movietheater.radar.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShowtimeRadarPreferenceResponse {

    private boolean enabled;
    private List<UUID> genreUuids;
    private Integer timeSlotStartHour;
    private Integer timeSlotEndHour;
    private boolean includeFavorites;
    private OffsetDateTime updatedAt;
    private int upcomingShowtimeCount;
    private List<ShowtimeRadarSuggestionResponse> suggestions;
}
