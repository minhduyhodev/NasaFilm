package com.thdpv.movietheater.orbit.service;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.booking.dto.response.ShowtimeResponse;
import com.thdpv.movietheater.booking.service.ShowtimeService;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OrbitRoomResponseMapper {

    private final ShowtimeService showtimeService;

    public void enrichShowtimeContext(OrbitRoomResponse response, OrbitRoom room) {
        if (response == null || room == null || room.getShowtimeUuid() == null) {
            return;
        }
        Optional<ShowtimeResponse> summary = showtimeService.getShowtimeSummary(room.getShowtimeUuid());
        summary.ifPresent(st -> {
            response.setMovieUuid(st.getMovieUuid());
            response.setMovieTitle(st.getMovieTitle());
            response.setMoviePoster(st.getMoviePosterUrl());
            response.setShowtimeStartTime(st.getStartTime());
            String cinema = st.getCinemaName() != null ? st.getCinemaName() : "";
            String roomName = st.getCinemaRoomName() != null ? st.getCinemaRoomName() : "";
            if (!cinema.isBlank() && !roomName.isBlank()) {
                response.setTheater(cinema + " - " + roomName);
            } else if (!cinema.isBlank()) {
                response.setTheater(cinema);
            } else {
                response.setTheater(roomName);
            }
        });
    }
}
