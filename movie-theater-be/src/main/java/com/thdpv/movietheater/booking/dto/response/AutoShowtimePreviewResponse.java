package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AutoShowtimePreviewResponse {
    private UUID movieUuid;
    private String movieTitle;
    private String moviePosterUrl;
    private Integer durationMinutes;
    private UUID cinemaRoomUuid;
    private String cinemaRoomName;
    private String cinemaName;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private BigDecimal basePrice;
    private BigDecimal vipPrice;
    private BigDecimal couplePrice;
    private Double priorityScore;
    private Map<String, Object> scoreBreakdown;
}
