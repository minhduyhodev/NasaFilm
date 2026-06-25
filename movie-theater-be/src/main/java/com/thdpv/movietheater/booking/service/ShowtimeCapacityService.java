package com.thdpv.movietheater.booking.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.SeatLockedRepository;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.booking.entity.Showtime;

@Service
public class ShowtimeCapacityService {

    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatLockedRepository seatLockedRepository;

    public ShowtimeCapacityService(
            ShowtimeRepository showtimeRepository,
            CinemaRoomRepository cinemaRoomRepository,
            BookingSeatRepository bookingSeatRepository,
            SeatLockedRepository seatLockedRepository) {
        this.showtimeRepository = showtimeRepository;
        this.cinemaRoomRepository = cinemaRoomRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.seatLockedRepository = seatLockedRepository;
    }

    /**
     * Validates that requested seats fit room capacity, counting confirmed bookings
     * and active locks from other users. When {@code excludeLockUserUuid} is set,
     * that user's current locks are excluded (they are being replaced).
     */
    public void validateCapacity(UUID showtimeUuid, int requestedSeatCount, UUID excludeLockUserUuid,
            OffsetDateTime now) {
        if (requestedSeatCount <= 0 || showtimeUuid == null) {
            return;
        }

        Showtime showtime = showtimeRepository.findById(showtimeUuid).orElse(null);
        if (showtime == null) {
            return;
        }

        CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomUuid()).orElse(null);
        if (room == null || room.getCapacity() == null || room.getCapacity() <= 0) {
            return;
        }

        OffsetDateTime effectiveNow = now != null ? now : OffsetDateTime.now();
        long bookedSeats = bookingSeatRepository.countByShowtimeUuid(showtimeUuid);
        long activeLocks = excludeLockUserUuid != null
                ? seatLockedRepository.countDistinctActiveLocksExcludingUser(showtimeUuid, excludeLockUserUuid,
                        effectiveNow)
                : seatLockedRepository.countDistinctActiveLocks(showtimeUuid, effectiveNow);

        long occupied = bookedSeats + activeLocks + requestedSeatCount;
        if (occupied > room.getCapacity()) {
            long remaining = Math.max(0, room.getCapacity() - bookedSeats - activeLocks);
            throw new AppException(ErrorCode.CONFLICT,
                    "Phong chieu chi con " + remaining + " cho trong");
        }
    }
}
