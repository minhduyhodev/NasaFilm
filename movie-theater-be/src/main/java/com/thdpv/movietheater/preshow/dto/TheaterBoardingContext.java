package com.thdpv.movietheater.preshow.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TheaterBoardingContext(
        UUID bookingUuid,
        UUID userUuid,
        String bookingStatus,
        String bookingType,
        UUID movieUuid,
        OffsetDateTime showtimeStart,
        OffsetDateTime showtimeEnd,
        String movieTitle,
        String cinemaName,
        String cinemaAddress,
        String entranceNote,
        Double cinemaLatitude,
        Double cinemaLongitude,
        String roomName,
        Integer userScore) {
}
