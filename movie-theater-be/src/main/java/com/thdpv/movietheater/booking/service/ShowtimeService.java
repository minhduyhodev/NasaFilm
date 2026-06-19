package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.AutoShowtimeRequest;
import com.thdpv.movietheater.booking.dto.response.AutoShowtimePreviewResponse;

import com.thdpv.movietheater.booking.dto.request.ShowtimeRequest;
import com.thdpv.movietheater.booking.dto.response.ShowtimeResponse;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.BookingComboRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingComboRepository bookingComboRepository;
    private final TicketRepository ticketRepository;
    private final BookingNativeRepository bookingNativeRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public ShowtimeResponse createShowtime(ShowtimeRequest request) {
        Movie movie = movieRepository.findById(request.getMovieUuid())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phim khong ton tai"));

        CinemaRoom room = cinemaRoomRepository.findById(request.getCinemaRoomUuid())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));

        if (room.getStatus() != CinemaRoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong chieu khong o trang thai hoat dong");
        }

        // Calculate end time: startTime + movie duration + 10 mins trailer buffer
        int duration = movie.getDurationMinutes() != null ? movie.getDurationMinutes() : 120;
        OffsetDateTime endTime = request.getStartTime().plusMinutes(duration + 10);

        // Overlap check with 15 mins cleaning buffer before and after
        OffsetDateTime startWithBuffer = request.getStartTime().minusMinutes(15);
        OffsetDateTime endWithBuffer = endTime.plusMinutes(15);

        List<Showtime> overlaps = showtimeRepository.findOverlappingShowtimes(
                room.getUuid(),
                UUID.randomUUID(), // Pass random UUID for new entity
                startWithBuffer,
                endWithBuffer
        );

        if (!overlaps.isEmpty()) {
            throw new AppException(ErrorCode.CONFLICT, "Lich chieu bi trung lap voi suat chieu khac trong phong.");
        }

        Showtime showtime = new Showtime();
        showtime.setMovieUuid(movie.getUuid());
        showtime.setCinemaRoomUuid(room.getUuid());
        showtime.setStartTime(request.getStartTime());
        showtime.setEndTime(endTime);
        showtime.setStatus(ShowtimeStatus.DRAFT);
        showtime.setBasePrice(request.getBasePrice());
        showtime.setVipPrice(request.getVipPrice());
        showtime.setCouplePrice(request.getCouplePrice());

        Showtime savedShowtime = showtimeRepository.save(showtime);
        return toShowtimeResponse(savedShowtime, movie, room);
    }

    @Transactional
    public ShowtimeResponse updateShowtimeStatus(UUID showtimeUuid, ShowtimeStatus newStatus) {
        Showtime showtime = showtimeRepository.findById(showtimeUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Suat chieu khong ton tai"));

        ShowtimeStatus current = showtime.getStatus();
        if (current == ShowtimeStatus.CANCELLED || current == ShowtimeStatus.FINISHED) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu da ket thuc hoac bi huy, khong the thay doi trang thai.");
        }

        // Validate state machine transitions
        if (current == ShowtimeStatus.DRAFT && newStatus != ShowtimeStatus.SCHEDULED) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai nhap chi co the chuyen sang Da len lich.");
        }
        if (current == ShowtimeStatus.SCHEDULED && newStatus != ShowtimeStatus.OPEN_FOR_BOOKING && newStatus != ShowtimeStatus.CANCELLED) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai Da len lich chi co the chuyen sang Mo ban ve hoac Huy.");
        }
        if (current == ShowtimeStatus.OPEN_FOR_BOOKING && newStatus != ShowtimeStatus.SOLD_OUT && newStatus != ShowtimeStatus.CANCELLED && newStatus != ShowtimeStatus.FINISHED) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai Mo ban ve chi co the chuyen sang Het ve, Huy hoac Ket thuc.");
        }
        if (current == ShowtimeStatus.SOLD_OUT && newStatus != ShowtimeStatus.OPEN_FOR_BOOKING && newStatus != ShowtimeStatus.CANCELLED && newStatus != ShowtimeStatus.FINISHED) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai Het ve chi co the chuyen sang Mo ban ve, Huy hoac Ket thuc.");
        }

        // Handle cancellations
        if (newStatus == ShowtimeStatus.CANCELLED) {
            // Delete active seat locks
            entityManager.createNativeQuery("DELETE FROM seat_locked WHERE showtime_uuid = :showtimeUuid")
                    .setParameter("showtimeUuid", showtimeUuid)
                    .executeUpdate();

            // Handle confirmed bookings cancellation and score deduction
            List<Booking> bookings = bookingRepository.findByShowtimeUuid(showtimeUuid);
            for (Booking booking : bookings) {
                if ("CONFIRMED".equalsIgnoreCase(booking.getStatus())) {
                    booking.setStatus("CANCELLED");
                    booking.setCancelledAt(OffsetDateTime.now());
                    bookingRepository.save(booking);

                    // Delete related seats, combos, and tickets
                    bookingSeatRepository.deleteByBookingUuid(booking.getUuid());
                    bookingComboRepository.deleteByBookingUuid(booking.getUuid());
                    ticketRepository.deleteByBookingUuid(booking.getUuid());

                    // Deduct user score points
                    BigDecimal price = booking.getTotalPrice();
                    int scoreDeducted = price.divide(BigDecimal.valueOf(10000), 0, java.math.RoundingMode.DOWN).intValue();
                    if (scoreDeducted > 0) {
                        bookingNativeRepository.addUserScore(booking.getUserUuid(), -scoreDeducted);
                        bookingNativeRepository.insertRefundScoreHistory(booking.getUserUuid(), scoreDeducted, booking.getUuid(), OffsetDateTime.now());
                    }
                }
            }
        }

        showtime.setStatus(newStatus);
        Showtime updatedShowtime = showtimeRepository.save(showtime);

        Movie movie = movieRepository.findById(updatedShowtime.getMovieUuid()).orElse(null);
        CinemaRoom room = cinemaRoomRepository.findById(updatedShowtime.getCinemaRoomUuid()).orElse(null);

        return toShowtimeResponse(updatedShowtime, movie, room);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getAdminShowtimes() {
        return showtimeRepository.findAll().stream()
                .map(st -> {
                    Movie movie = movieRepository.findById(st.getMovieUuid()).orElse(null);
                    CinemaRoom room = cinemaRoomRepository.findById(st.getCinemaRoomUuid()).orElse(null);
                    return toShowtimeResponse(st, movie, room);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicShowtimes() {
        OffsetDateTime now = OffsetDateTime.now();
        return showtimeRepository.findAll().stream()
                .filter(st -> (st.getStatus() == ShowtimeStatus.OPEN_FOR_BOOKING || st.getStatus() == ShowtimeStatus.SOLD_OUT)
                        && st.getStartTime().isAfter(now))
                .map(st -> {
                    Movie movie = movieRepository.findById(st.getMovieUuid()).orElse(null);
                    CinemaRoom room = cinemaRoomRepository.findById(st.getCinemaRoomUuid()).orElse(null);
                    return toShowtimeResponse(st, movie, room);
                })
                .collect(Collectors.toList());
    }

    private String resolvePrimaryMediaUrl(Movie movie) {
        if (movie == null || movie.getMovieMedias() == null) {
            return null;
        }
        for (MovieMedia movieMedia : movie.getMovieMedias()) {
            if (Boolean.TRUE.equals(movieMedia.getIsPrimary())) {
                return movieMedia.getMediaUrl();
            }
        }
        return movie.getMovieMedias().stream()
                .findFirst()
                .map(MovieMedia::getMediaUrl)
                .orElse(null);
    }

    private ShowtimeResponse toShowtimeResponse(Showtime showtime, Movie movie, CinemaRoom room) {
        String movieTitle = movie != null ? movie.getTitle() : "Unkown Movie";
        String moviePosterUrl = resolvePrimaryMediaUrl(movie);
        String roomName = room != null ? room.getName() : "Unknown Room";
        String cinemaName = (room != null && room.getCinema() != null) ? room.getCinema().getName() : "Unknown Cinema";

        return new ShowtimeResponse(
                showtime.getUuid(),
                showtime.getMovieUuid(),
                movieTitle,
                moviePosterUrl,
                showtime.getCinemaRoomUuid(),
                roomName,
                cinemaName,
                showtime.getStartTime(),
                showtime.getEndTime(),
                showtime.getBasePrice(),
                showtime.getVipPrice(),
                showtime.getCouplePrice(),
                showtime.getStatus()
        );
    }

    @Transactional(readOnly = true)
    public List<AutoShowtimePreviewResponse> getAutoShowtimesPreview(AutoShowtimeRequest request) {
        List<Movie> selectedMovies = movieRepository.findAllById(request.getMovieUuids());
        if (selectedMovies.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sach phim trong hoac khong ton tai");
        }

        List<CinemaRoom> selectedRooms = cinemaRoomRepository.findAllById(request.getRoomUuids());
        if (selectedRooms.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sach phong chieu trong hoac khong ton tai");
        }

        java.time.ZoneOffset offset = OffsetDateTime.now().getOffset();
        OffsetDateTime startRange = request.getStartDate().atStartOfDay().atOffset(offset);
        OffsetDateTime endRange = request.getEndDate().plusDays(1).atStartOfDay().atOffset(offset);

        List<Showtime> existingShowtimes = showtimeRepository.findActiveShowtimesInRooms(request.getRoomUuids(), startRange, endRange);

        List<AutoShowtimePreviewResponse> previewList = new ArrayList<>();
        int cleaningMinutes = request.getIntervalMinutes() != null ? request.getIntervalMinutes() : 15;
        int trailerBuffer = request.getTrailerBuffer() != null ? request.getTrailerBuffer() : 10;

        LocalDate current = request.getStartDate();
        while (!current.isAfter(request.getEndDate())) {
            for (CinemaRoom room : selectedRooms) {
                OffsetDateTime dayStart = current.atTime(request.getStartTime()).atOffset(offset);
                OffsetDateTime dayEnd = current.atTime(request.getEndTime()).atOffset(offset);

                List<TimeInterval> freeIntervals = new ArrayList<>();
                freeIntervals.add(new TimeInterval(dayStart, dayEnd));

                LocalDate filterDate = current;
                List<Showtime> roomDayShowtimes = existingShowtimes.stream()
                        .filter(st -> st.getCinemaRoomUuid().equals(room.getUuid()) && st.getStartTime().toLocalDate().equals(filterDate))
                        .toList();

                for (Showtime st : roomDayShowtimes) {
                    OffsetDateTime occStart = st.getStartTime().minusMinutes(cleaningMinutes);
                    OffsetDateTime occEnd = st.getEndTime().plusMinutes(cleaningMinutes);
                    freeIntervals = subtractIntervals(freeIntervals, occStart, occEnd);
                }

                List<CandidateSlot> candidates = new ArrayList<>();
                for (TimeInterval interval : freeIntervals) {
                    for (Movie movie : selectedMovies) {
                        int duration = movie.getDurationMinutes() != null ? movie.getDurationMinutes() : 120;
                        int totalMinutes = duration + trailerBuffer;

                        OffsetDateTime currTime = alignToNext15Minutes(interval.getStart());
                        while (!currTime.plusMinutes(totalMinutes).isAfter(interval.getEnd())) {
                            if (currTime.plusMinutes(totalMinutes).isAfter(dayEnd)) {
                                break;
                            }

                            double weekendScore = calculateWeekendScore(filterDate);
                            double goldenHourScore = calculateGoldenHourScore(currTime.toLocalTime());
                            double ratingScore = movie.getRating() != null ? movie.getRating() : 8.0;
                            double genreScore = calculateGenreScore(movie);

                            double totalScore = (request.getWeekendWeight() * weekendScore)
                                    + (request.getGoldenHourWeight() * goldenHourScore)
                                    + (request.getRatingWeight() * ratingScore)
                                    + (request.getGenreWeight() * genreScore);

                            Map<String, Object> breakdown = new java.util.HashMap<>();
                            breakdown.put("weekendScore", request.getWeekendWeight() * weekendScore);
                            breakdown.put("goldenHourScore", request.getGoldenHourWeight() * goldenHourScore);
                            breakdown.put("ratingScore", request.getRatingWeight() * ratingScore);
                            breakdown.put("genreScore", request.getGenreWeight() * genreScore);

                            AutoShowtimePreviewResponse preview = new AutoShowtimePreviewResponse();
                            preview.setMovieUuid(movie.getUuid());
                            preview.setMovieTitle(movie.getTitle());
                            preview.setMoviePosterUrl(resolvePrimaryMediaUrl(movie));
                            preview.setDurationMinutes(duration);
                            preview.setCinemaRoomUuid(room.getUuid());
                            preview.setCinemaRoomName(room.getName());
                            preview.setCinemaName(room.getCinema() != null ? room.getCinema().getName() : "Unknown Cinema");
                            preview.setStartTime(currTime);
                            preview.setEndTime(currTime.plusMinutes(totalMinutes));
                            preview.setBasePrice(request.getBasePrice());
                            preview.setVipPrice(request.getVipPrice());
                            preview.setCouplePrice(request.getCouplePrice());
                            preview.setPriorityScore(totalScore);
                            preview.setScoreBreakdown(breakdown);

                            candidates.add(new CandidateSlot(preview, totalScore));

                            currTime = currTime.plusMinutes(30);
                        }
                    }
                }

                candidates.sort(Comparator.comparingDouble(CandidateSlot::getScore).reversed());
                List<AutoShowtimePreviewResponse> scheduledForRoom = new ArrayList<>();

                for (CandidateSlot cand : candidates) {
                    AutoShowtimePreviewResponse target = cand.getResponse();
                    OffsetDateTime targetStart = target.getStartTime();
                    OffsetDateTime targetEnd = target.getEndTime();
                    int targetDuration = target.getDurationMinutes();

                    boolean hasConflict = false;
                    for (AutoShowtimePreviewResponse sch : scheduledForRoom) {
                        OffsetDateTime schStartWithBuffer = sch.getStartTime().minusMinutes(cleaningMinutes);
                        OffsetDateTime schEndWithBuffer = sch.getEndTime().plusMinutes(cleaningMinutes);

                        if (targetStart.isBefore(schEndWithBuffer) && targetEnd.isAfter(schStartWithBuffer)) {
                            hasConflict = true;
                            break;
                        }

                        if (sch.getMovieUuid().equals(target.getMovieUuid())) {
                            long startDiff = Math.abs(java.time.Duration.between(targetStart, sch.getStartTime()).toMinutes());
                            if (startDiff < (targetDuration + trailerBuffer + cleaningMinutes + 30)) {
                                hasConflict = true;
                                break;
                            }
                        }
                    }

                    if (!hasConflict) {
                        scheduledForRoom.add(target);
                        previewList.add(target);
                    }
                }
            }
            current = current.plusDays(1);
        }

        previewList.sort((a, b) -> {
            int dateComp = a.getStartTime().toLocalDate().compareTo(b.getStartTime().toLocalDate());
            if (dateComp != 0) return dateComp;
            int roomComp = a.getCinemaRoomName().compareTo(b.getCinemaRoomName());
            if (roomComp != 0) return roomComp;
            return a.getStartTime().compareTo(b.getStartTime());
        });

        return previewList;
    }

    @Transactional
    public List<ShowtimeResponse> saveAutoShowtimes(List<ShowtimeRequest> requests) {
        List<ShowtimeResponse> savedList = new ArrayList<>();
        for (ShowtimeRequest req : requests) {
            savedList.add(createShowtime(req));
        }
        return savedList;
    }

    private List<TimeInterval> subtractIntervals(List<TimeInterval> freeIntervals, OffsetDateTime occupiedStart, OffsetDateTime occupiedEnd) {
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

    private OffsetDateTime alignToNext15Minutes(OffsetDateTime dt) {
        int minutes = dt.getMinute();
        int remainder = minutes % 15;
        if (remainder == 0) {
            return dt.withSecond(0).withNano(0);
        }
        return dt.plusMinutes(15 - remainder).withSecond(0).withNano(0);
    }

    private double calculateWeekendScore(LocalDate date) {
        java.time.DayOfWeek day = date.getDayOfWeek();
        if (day == java.time.DayOfWeek.FRIDAY || day == java.time.DayOfWeek.SATURDAY || day == java.time.DayOfWeek.SUNDAY) {
            return 10.0;
        }
        return 0.0;
    }

    private double calculateGoldenHourScore(LocalTime time) {
        LocalTime peakStart = LocalTime.of(18, 0);
        LocalTime peakEnd = LocalTime.of(22, 30);
        LocalTime nearStart1 = LocalTime.of(12, 0);
        LocalTime nearEnd1 = LocalTime.of(18, 0);
        LocalTime nearStart2 = LocalTime.of(22, 30);
        LocalTime nearEnd2 = LocalTime.of(23, 59);

        if ((time.equals(peakStart) || time.isAfter(peakStart)) && time.isBefore(peakEnd)) {
            return 15.0;
        } else if (((time.equals(nearStart1) || time.isAfter(nearStart1)) && time.isBefore(nearEnd1))
                || ((time.equals(nearStart2) || time.isAfter(nearStart2)) && time.isBefore(nearEnd2))) {
            return 8.0;
        }
        return 0.0;
    }

    private double calculateGenreScore(Movie movie) {
        double maxScore = 4.0;
        if (movie.getMovieGenres() != null) {
            for (MovieGenre mg : movie.getMovieGenres()) {
                if (mg.getGenre() != null && mg.getGenre().getName() != null) {
                    String name = mg.getGenre().getName().toLowerCase();
                    if (name.contains("hành động") || name.contains("viễn tưởng") || name.contains("hoạt hình")) {
                        maxScore = Math.max(maxScore, 10.0);
                    } else if (name.contains("phiêu lưu") || name.contains("kịch tính") || name.contains("tình cảm")) {
                        maxScore = Math.max(maxScore, 7.0);
                    }
                }
            }
        }
        return maxScore;
    }

    public static class TimeInterval {
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

    private static class CandidateSlot {
        private final AutoShowtimePreviewResponse response;
        private final double score;

        public CandidateSlot(AutoShowtimePreviewResponse response, double score) {
            this.response = response;
            this.score = score;
        }

        public AutoShowtimePreviewResponse getResponse() {
            return response;
        }

        public double getScore() {
            return score;
        }
    }
}
