package com.thdpv.movietheater.booking.service.scheduling;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.booking.dto.request.AutoShowtimeRequest;
import com.thdpv.movietheater.booking.dto.response.AutoShowtimePreviewResponse;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieGenre;

@Component
public class ShowtimeSchedulingEngine {

    public List<AutoShowtimePreviewResponse> generatePreview(
            AutoShowtimeRequest request,
            ShowtimeSchedulingSettings settings,
            List<Movie> selectedMovies,
            List<CinemaRoom> selectedRooms,
            List<Showtime> existingShowtimes,
            Function<Movie, String> posterResolver) {

        if (!settings.getEndTime().isAfter(settings.getStartTime())) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Giờ đóng cửa phải sau giờ mở cửa (khung giờ hoạt động không hợp lệ)");
        }

        ZoneOffset offset = OffsetDateTime.now().getOffset();
        OffsetDateTime now = OffsetDateTime.now(offset);
        OffsetDateTime startRange = request.getStartDate().atStartOfDay().atOffset(offset);
        OffsetDateTime endRange = request.getEndDate().plusDays(1).atStartOfDay().atOffset(offset);

        List<Showtime> scopedExisting = existingShowtimes.stream()
                .filter(st -> st.getStartTime().isBefore(endRange) && st.getEndTime().isAfter(startRange))
                .toList();

        List<AutoShowtimePreviewResponse> previewList = new ArrayList<>();
        int cleaningMinutes = settings.getIntervalMinutes();
        int trailerBuffer = settings.getTrailerBuffer();

        LocalDate current = request.getStartDate();
        while (!current.isAfter(request.getEndDate())) {
            boolean isToday = current.isEqual(now.toLocalDate());
            for (CinemaRoom room : selectedRooms) {
                OffsetDateTime dayStart = current.atTime(settings.getStartTime()).atOffset(offset);
                OffsetDateTime dayEnd = current.atTime(settings.getEndTime()).atOffset(offset);

                // Skip slots inside the minimum lead window when generating for today.
                if (isToday) {
                    OffsetDateTime earliestStart = now.plusMinutes(settings.getMinLeadMinutes());
                    if (dayStart.isBefore(earliestStart)) {
                        dayStart = earliestStart;
                    }
                }
                if (!dayStart.isBefore(dayEnd)) {
                    continue;
                }

                List<TimeInterval> freeIntervals = new ArrayList<>();
                freeIntervals.add(new TimeInterval(dayStart, dayEnd));

                LocalDate filterDate = current;
                List<Showtime> roomDayShowtimes = scopedExisting.stream()
                        .filter(st -> st.getCinemaRoomUuid().equals(room.getUuid())
                                && st.getStartTime().toLocalDate().equals(filterDate))
                        .toList();

                for (Showtime st : roomDayShowtimes) {
                    OffsetDateTime occStart = st.getStartTime().minusMinutes(cleaningMinutes);
                    OffsetDateTime occEnd = st.getEndTime().plusMinutes(cleaningMinutes);
                    freeIntervals = subtractIntervals(freeIntervals, occStart, occEnd);
                }

                List<CandidateSlot> candidates = new ArrayList<>();
                for (TimeInterval interval : freeIntervals) {
                    for (Movie movie : selectedMovies) {
                        int duration = movie.getDurationMinutes() != null
                                ? movie.getDurationMinutes()
                                : settings.getDefaultDurationMinutes();
                        int totalMinutes = duration + trailerBuffer;

                        OffsetDateTime currTime = alignToGrid(interval.getStart(), settings.getGridAlignMinutes());
                        while (!currTime.plusMinutes(totalMinutes).isAfter(interval.getEnd())) {
                            if (currTime.plusMinutes(totalMinutes).isAfter(dayEnd)) {
                                break;
                            }

                            double weekendScore = calculateWeekendScore(filterDate, settings);
                            double goldenHourScore = calculateGoldenHourScore(currTime.toLocalTime(), settings);
                            double ratingScore = movie.getRating() != null
                                    ? movie.getRating()
                                    : settings.getDefaultRating();
                            double genreScore = calculateGenreScore(movie, settings);

                            double totalScore = (settings.getWeekendWeight() * weekendScore)
                                    + (settings.getGoldenHourWeight() * goldenHourScore)
                                    + (settings.getRatingWeight() * ratingScore)
                                    + (settings.getGenreWeight() * genreScore);

                            Map<String, Object> breakdown = new HashMap<>();
                            breakdown.put("weekendScore", settings.getWeekendWeight() * weekendScore);
                            breakdown.put("goldenHourScore", settings.getGoldenHourWeight() * goldenHourScore);
                            breakdown.put("ratingScore", settings.getRatingWeight() * ratingScore);
                            breakdown.put("genreScore", settings.getGenreWeight() * genreScore);

                            AutoShowtimePreviewResponse preview = new AutoShowtimePreviewResponse();
                            preview.setMovieUuid(movie.getUuid());
                            preview.setMovieTitle(movie.getTitle());
                            preview.setMoviePosterUrl(posterResolver.apply(movie));
                            preview.setDurationMinutes(duration);
                            preview.setCinemaRoomUuid(room.getUuid());
                            preview.setCinemaRoomName(room.getName());
                            preview.setCinemaName(room.getCinema() != null ? room.getCinema().getName() : "Unknown Cinema");
                            preview.setStartTime(currTime);
                            preview.setEndTime(currTime.plusMinutes(totalMinutes));
                            preview.setBasePrice(request.getBasePrice() != null ? request.getBasePrice() : settings.getBasePrice());
                            preview.setVipPrice(request.getVipPrice() != null ? request.getVipPrice() : settings.getVipPrice());
                            preview.setCouplePrice(request.getCouplePrice() != null ? request.getCouplePrice() : settings.getCouplePrice());
                            preview.setPriorityScore(totalScore);
                            preview.setScoreBreakdown(breakdown);

                            candidates.add(new CandidateSlot(preview, totalScore));
                            currTime = currTime.plusMinutes(settings.getSlotStepMinutes());
                        }
                    }
                }

                List<AutoShowtimePreviewResponse> scheduledForRoom = new ArrayList<>();
                ensureMinimumMovieCoverage(selectedMovies, candidates, scheduledForRoom,
                        cleaningMinutes, trailerBuffer, settings);
                previewList.addAll(scheduledForRoom);

                Set<String> scheduledKeys = scheduledForRoom.stream()
                        .map(this::slotKey)
                        .collect(Collectors.toSet());
                Map<UUID, Long> movieShowtimeCounts = scheduledForRoom.stream()
                        .collect(Collectors.groupingBy(
                                AutoShowtimePreviewResponse::getMovieUuid, Collectors.counting()));

                boolean added;
                do {
                    added = false;
                    CandidateSlot bestCandidate = null;
                    double bestAdjustedScore = Double.NEGATIVE_INFINITY;

                    for (CandidateSlot cand : candidates) {
                        AutoShowtimePreviewResponse target = cand.getResponse();
                        if (scheduledKeys.contains(slotKey(target))) {
                            continue;
                        }
                        if (hasSchedulingConflict(target, scheduledForRoom, cleaningMinutes, trailerBuffer, settings)) {
                            continue;
                        }

                        long count = movieShowtimeCounts.getOrDefault(target.getMovieUuid(), 0L);
                        double adjustedScore = cand.getScore() - (count * settings.getFairnessPenalty());
                        if (adjustedScore > bestAdjustedScore) {
                            bestAdjustedScore = adjustedScore;
                            bestCandidate = cand;
                        }
                    }

                    if (bestCandidate != null) {
                        AutoShowtimePreviewResponse target = bestCandidate.getResponse();
                        scheduledForRoom.add(target);
                        scheduledKeys.add(slotKey(target));
                        movieShowtimeCounts.merge(target.getMovieUuid(), 1L, Long::sum);
                        previewList.add(target);
                        added = true;
                    }
                } while (added);
            }
            current = current.plusDays(1);
        }

        previewList.sort((a, b) -> {
            int dateComp = a.getStartTime().toLocalDate().compareTo(b.getStartTime().toLocalDate());
            if (dateComp != 0) {
                return dateComp;
            }
            int roomComp = a.getCinemaRoomName().compareTo(b.getCinemaRoomName());
            if (roomComp != 0) {
                return roomComp;
            }
            return a.getStartTime().compareTo(b.getStartTime());
        });

        return previewList;
    }

    private void ensureMinimumMovieCoverage(
            List<Movie> movies,
            List<CandidateSlot> candidates,
            List<AutoShowtimePreviewResponse> scheduledForRoom,
            int cleaningMinutes,
            int trailerBuffer,
            ShowtimeSchedulingSettings settings) {

        Set<UUID> uncovered = movies.stream().map(Movie::getUuid).collect(Collectors.toSet());
        boolean progress = true;

        while (progress && !uncovered.isEmpty()) {
            progress = false;

            List<UUID> ordered = uncovered.stream()
                    .sorted(Comparator.comparingDouble(uuid -> movies.stream()
                            .filter(m -> m.getUuid().equals(uuid))
                            .findFirst()
                            .map(m -> m.getRating() != null ? m.getRating() : settings.getDefaultRating())
                            .orElse(settings.getDefaultRating())))
                    .toList();

            for (UUID movieUuid : ordered) {
                CandidateSlot best = candidates.stream()
                        .filter(c -> c.getResponse().getMovieUuid().equals(movieUuid))
                        .filter(c -> !hasSchedulingConflict(
                                c.getResponse(), scheduledForRoom, cleaningMinutes, trailerBuffer, settings))
                        .max(Comparator.comparingDouble(CandidateSlot::getScore))
                        .orElse(null);

                if (best != null) {
                    scheduledForRoom.add(best.getResponse());
                    uncovered.remove(movieUuid);
                    progress = true;
                }
            }
        }
    }

    private boolean hasSchedulingConflict(
            AutoShowtimePreviewResponse target,
            List<AutoShowtimePreviewResponse> scheduled,
            int cleaningMinutes,
            int trailerBuffer,
            ShowtimeSchedulingSettings settings) {

        OffsetDateTime targetStart = target.getStartTime();
        OffsetDateTime targetEnd = target.getEndTime();
        int targetDuration = target.getDurationMinutes();

        for (AutoShowtimePreviewResponse sch : scheduled) {
            OffsetDateTime schStartWithBuffer = sch.getStartTime().minusMinutes(cleaningMinutes);
            OffsetDateTime schEndWithBuffer = sch.getEndTime().plusMinutes(cleaningMinutes);

            if (targetStart.isBefore(schEndWithBuffer) && targetEnd.isAfter(schStartWithBuffer)) {
                return true;
            }

            if (sch.getMovieUuid().equals(target.getMovieUuid())) {
                long startDiff = Math.abs(java.time.Duration.between(targetStart, sch.getStartTime()).toMinutes());
                int minGap = targetDuration + trailerBuffer + cleaningMinutes + settings.getSameMovieGapMinutes();
                if (startDiff < minGap) {
                    return true;
                }
            }
        }
        return false;
    }

    private String slotKey(AutoShowtimePreviewResponse slot) {
        return slot.getMovieUuid() + "|" + slot.getCinemaRoomUuid() + "|" + slot.getStartTime();
    }

    private List<TimeInterval> subtractIntervals(
            List<TimeInterval> freeIntervals,
            OffsetDateTime occupiedStart,
            OffsetDateTime occupiedEnd) {

        List<TimeInterval> result = new ArrayList<>();
        for (TimeInterval interval : freeIntervals) {
            OffsetDateTime s = interval.getStart();
            OffsetDateTime e = interval.getEnd();

            if (occupiedEnd.isBefore(s) || occupiedStart.isAfter(e)) {
                result.add(interval);
            } else {
                if (occupiedStart.isAfter(s)) {
                    result.add(new TimeInterval(s, occupiedStart));
                }
                if (occupiedEnd.isBefore(e)) {
                    result.add(new TimeInterval(occupiedEnd, e));
                }
            }
        }
        return result;
    }

    private OffsetDateTime alignToGrid(OffsetDateTime dt, int gridMinutes) {
        int step = Math.max(1, gridMinutes);
        int minutes = dt.getMinute();
        int remainder = minutes % step;
        if (remainder == 0) {
            return dt.withSecond(0).withNano(0);
        }
        return dt.plusMinutes(step - remainder).withSecond(0).withNano(0);
    }

    private double calculateWeekendScore(LocalDate date, ShowtimeSchedulingSettings settings) {
        DayOfWeek day = date.getDayOfWeek();
        boolean weekend = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY
                || (settings.isIncludeFridayAsWeekend() && day == DayOfWeek.FRIDAY);
        return weekend ? settings.getWeekendScore() : settings.getWeekdayScore();
    }

    private double calculateGoldenHourScore(LocalTime time, ShowtimeSchedulingSettings settings) {
        if (isWithinRange(time, settings.getGoldenHourPeakStart(), settings.getGoldenHourPeakEnd())) {
            return settings.getGoldenHourPeakScore();
        }
        if (isWithinRange(time, settings.getGoldenHourNearStart1(), settings.getGoldenHourNearEnd1())
                || isWithinRange(time, settings.getGoldenHourNearStart2(), settings.getGoldenHourNearEnd2())) {
            return settings.getGoldenHourNearScore();
        }
        return 0.0;
    }

    private boolean isWithinRange(LocalTime time, LocalTime start, LocalTime end) {
        if (start == null || end == null) {
            return false;
        }
        if (end.isBefore(start)) {
            return !time.isBefore(start) || time.isBefore(end);
        }
        return (time.equals(start) || time.isAfter(start)) && time.isBefore(end);
    }

    private double calculateGenreScore(Movie movie, ShowtimeSchedulingSettings settings) {
        double maxScore = settings.getGenreTierBase();
        if (movie.getMovieGenres() == null) {
            return maxScore;
        }
        for (MovieGenre mg : movie.getMovieGenres()) {
            if (mg.getGenre() == null || mg.getGenre().getName() == null) {
                continue;
            }
            String name = mg.getGenre().getName().toLowerCase();
            if (settings.getGenreHotKeywords().stream().anyMatch(name::contains)) {
                maxScore = Math.max(maxScore, settings.getGenreTierHot());
            } else if (settings.getGenreMidKeywords().stream().anyMatch(name::contains)) {
                maxScore = Math.max(maxScore, settings.getGenreTierMid());
            }
        }
        return maxScore;
    }

    public static final class TimeInterval {
        private final OffsetDateTime start;
        private final OffsetDateTime end;

        public TimeInterval(OffsetDateTime start, OffsetDateTime end) {
            this.start = start;
            this.end = end;
        }

        public OffsetDateTime getStart() {
            return start;
        }

        public OffsetDateTime getEnd() {
            return end;
        }
    }

    private static final class CandidateSlot {
        private final AutoShowtimePreviewResponse response;
        private final double score;

        private CandidateSlot(AutoShowtimePreviewResponse response, double score) {
            this.response = response;
            this.score = score;
        }

        private AutoShowtimePreviewResponse getResponse() {
            return response;
        }

        private double getScore() {
            return score;
        }
    }
}
