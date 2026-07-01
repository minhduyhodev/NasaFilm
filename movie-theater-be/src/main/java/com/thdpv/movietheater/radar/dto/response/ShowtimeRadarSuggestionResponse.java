package com.thdpv.movietheater.radar.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShowtimeRadarSuggestionResponse {

    private UUID showtimeUuid;
    private UUID movieUuid;
    private String movieTitle;
    private String cinemaName;
    private OffsetDateTime startTime;
    private int availableSeats;
    private int heatScore;
    private List<String> reasons;
}
