package com.thdpv.movietheater.preshow.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PreShowReminderCandidate(
        UUID bookingUuid,
        UUID userUuid,
        OffsetDateTime showtimeStart,
        String movieTitle,
        String cinemaName,
        Double cinemaLatitude,
        Double cinemaLongitude,
        String cinemaAddress) {
}
