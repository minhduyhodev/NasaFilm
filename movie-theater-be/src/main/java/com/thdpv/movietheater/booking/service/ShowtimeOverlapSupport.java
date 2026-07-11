package com.thdpv.movietheater.booking.service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;

import lombok.RequiredArgsConstructor;

/**
 * Overlap / slide helpers — tách khỏi ShowtimeService & BookingService để giảm merge conflict.
 */
@Component
@RequiredArgsConstructor
public class ShowtimeOverlapSupport {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;

    public List<Showtime> findOverlaps(
            UUID roomUuid,
            UUID excludeUuid,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            int cleaningMinutes) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startWithBuffer = startTime.minusMinutes(cleaningMinutes);
        OffsetDateTime endWithBuffer = endTime.plusMinutes(cleaningMinutes);
        return showtimeRepository.findOverlappingShowtimes(
                roomUuid, excludeUuid, startWithBuffer, endWithBuffer, now);
    }

    public String buildConflictMessage(List<Showtime> overlaps) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM HH:mm").withZone(AppTimeZones.BUSINESS);
        Set<UUID> movieUuids = overlaps.stream().map(Showtime::getMovieUuid).collect(Collectors.toSet());
        Map<UUID, String> titles = movieRepository.findAllById(movieUuids).stream()
                .collect(Collectors.toMap(Movie::getUuid, Movie::getTitle, (a, b) -> a));

        String details = overlaps.stream()
                .limit(3)
                .map(s -> {
                    String title = titles.getOrDefault(s.getMovieUuid(), "Phim");
                    String start = s.getStartTime() != null ? fmt.format(s.getStartTime()) : "?";
                    String end = s.getEndTime() != null ? fmt.format(s.getEndTime()) : "?";
                    return title + " [" + s.getStatus() + "] " + start + "-" + end;
                })
                .collect(Collectors.joining("; "));
        String more = overlaps.size() > 3 ? " (+" + (overlaps.size() - 3) + " khac)" : "";
        return "Lich chieu bi trung lap voi suat chieu khac trong phong: " + details + more;
    }

    /**
     * @return empty nếu không cần slide hoặc bị chồng lịch
     */
    public Optional<SlidePlan> planSlideIfPast(Showtime showtime, OffsetDateTime now) {
        if (showtime == null || showtime.getStartTime() == null || !showtime.getStartTime().isBefore(now)) {
            return Optional.empty();
        }
        long daysToAdd = 0;
        OffsetDateTime temp = showtime.getStartTime();
        while (temp.isBefore(now)) {
            temp = temp.plusDays(1);
            daysToAdd++;
        }
        OffsetDateTime newStart = showtime.getStartTime().plusDays(daysToAdd);
        OffsetDateTime newEnd = showtime.getEndTime() != null
                ? showtime.getEndTime().plusDays(daysToAdd)
                : newStart.plusHours(2);
        List<Showtime> overlaps = showtimeRepository.findOverlappingShowtimes(
                showtime.getCinemaRoomUuid(),
                showtime.getUuid(),
                newStart,
                newEnd,
                now);
        if (!overlaps.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new SlidePlan(newStart, daysToAdd));
    }

    public record SlidePlan(OffsetDateTime newStart, long daysToAdd) {
    }
}
