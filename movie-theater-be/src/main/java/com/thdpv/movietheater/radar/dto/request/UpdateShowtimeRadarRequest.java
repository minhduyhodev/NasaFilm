package com.thdpv.movietheater.radar.dto.request;

import java.util.List;
import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateShowtimeRadarRequest {

    private Boolean enabled;
    private List<UUID> genreUuids;
    private Integer timeSlotStartHour;
    private Integer timeSlotEndHour;
    private Boolean includeFavorites;
}
