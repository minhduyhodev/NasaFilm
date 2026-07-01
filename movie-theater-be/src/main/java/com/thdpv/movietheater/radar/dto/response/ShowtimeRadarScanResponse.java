package com.thdpv.movietheater.radar.dto.response;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShowtimeRadarScanResponse {

    private List<ShowtimeRadarSuggestionResponse> suggestions;
    private int upcomingShowtimeCount;
}
