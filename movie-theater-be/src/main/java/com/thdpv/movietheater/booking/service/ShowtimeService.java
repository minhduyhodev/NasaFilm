package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                showtime.getStatus()
        );
    }
}
