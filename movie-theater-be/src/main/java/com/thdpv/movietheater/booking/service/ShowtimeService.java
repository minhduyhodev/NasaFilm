package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.AutoShowtimeRequest;
import com.thdpv.movietheater.booking.dto.request.AutoShowtimeSaveRequest;
import com.thdpv.movietheater.booking.dto.response.AutoShowtimePreviewResponse;
import com.thdpv.movietheater.booking.service.scheduling.ShowtimeSchedulingEngine;
import com.thdpv.movietheater.booking.service.scheduling.ShowtimeSchedulingSettings;
import com.thdpv.movietheater.config.service.SystemConfigService;

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
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.time.AppTimeZones;

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
    private final CancellationRefundService cancellationRefundService;
    private final SystemConfigService systemConfigService;
    private final ShowtimeSchedulingEngine showtimeSchedulingEngine;
    private final ShowtimeOverlapSupport showtimeOverlapSupport;

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

        OffsetDateTime now = OffsetDateTime.now();
        if (request.getStartTime() == null || !request.getStartTime().isAfter(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chỉ được tạo suất chiếu cho thời gian sắp tới");
        }

        // Calculate end time from movie duration + trailer buffer (system config)
        ShowtimeSchedulingSettings settings = ShowtimeSchedulingSettings.fromConfig(systemConfigService.getConfig());
        int duration = movie.getDurationMinutes() != null
                ? movie.getDurationMinutes()
                : settings.getDefaultDurationMinutes();
        int trailerBuffer = settings.getTrailerBuffer();
        OffsetDateTime endTime = request.getStartTime().plusMinutes(duration + trailerBuffer);

        // Overlap check with cleaning buffer from config
        int cleaningMinutes = settings.getIntervalMinutes();
        List<Showtime> overlaps = showtimeOverlapSupport.findOverlaps(
                room.getUuid(),
                UUID.randomUUID(),
                request.getStartTime(),
                endTime,
                cleaningMinutes);

        if (!overlaps.isEmpty()) {
            throw new AppException(ErrorCode.CONFLICT, showtimeOverlapSupport.buildConflictMessage(overlaps));
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

        if (newStatus == ShowtimeStatus.SCHEDULED || newStatus == ShowtimeStatus.OPEN_FOR_BOOKING) {
            CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));
            if (room.getStatus() != CinemaRoomStatus.ACTIVE) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Phong chieu khong o trang thai hoat dong");
            }
        }

        // Validate state machine transitions
        if (current == ShowtimeStatus.DRAFT
                && newStatus != ShowtimeStatus.SCHEDULED
                && newStatus != ShowtimeStatus.CANCELLED) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Trang thai nhap chi co the chuyen sang Da len lich hoac Huy.");
        }
        if (current == ShowtimeStatus.SCHEDULED
                && newStatus != ShowtimeStatus.OPEN_FOR_BOOKING
                && newStatus != ShowtimeStatus.CANCELLED
                && newStatus != ShowtimeStatus.FINISHED) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Trang thai Da len lich chi co the chuyen sang Mo ban ve, Ket thuc hoac Huy.");
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

            // Refund confirmed bookings through cancellation service
            List<Booking> bookings = bookingRepository.findByShowtimeUuid(showtimeUuid);
            for (Booking booking : bookings) {
                if (!"CONFIRMED".equalsIgnoreCase(booking.getStatus())) {
                    continue;
                }
                try {
                    cancellationRefundService.cancelBooking(
                            booking.getUuid(),
                            null,
                            "SYSTEM",
                            true,
                            "Suat chieu bi huy boi quan tri",
                            true);
                } catch (AppException ex) {
                    // Skip bookings that cannot be cancelled (e.g. already processing)
                }
            }
        }

        if (newStatus == ShowtimeStatus.FINISHED) {
            OffsetDateTime now = OffsetDateTime.now();
            boolean showStillUpcoming = showtime.getEndTime() == null || showtime.getEndTime().isAfter(now);
            boolean hasConfirmedTickets = bookingRepository.findByShowtimeUuid(showtimeUuid).stream()
                    .anyMatch(b -> "CONFIRMED".equalsIgnoreCase(b.getStatus()));

            // Không kết thúc cưỡng bức suất còn vé đã bán mà chưa chiếu xong — ảnh hưởng giờ/ghế trên vé khách.
            // Admin muốn đóng suất có vé: dùng Hủy (hoàn tiền) hoặc đợi hết giờ chiếu.
            if (showStillUpcoming && hasConfirmedTickets) {
                throw new AppException(ErrorCode.CONFLICT,
                        "Không thể kết thúc suất còn vé đã thanh toán và chưa chiếu xong. "
                                + "Hãy chọn Hủy suất (hoàn tiền khách) hoặc đợi suất kết thúc tự động.");
            }

            // Chỉ xóa giữ ghế tạm (seat_locked), không đụng booking/ticket đã confirm
            entityManager.createNativeQuery("DELETE FROM seat_locked WHERE showtime_uuid = :showtimeUuid")
                    .setParameter("showtimeUuid", showtimeUuid)
                    .executeUpdate();

            // Chỉ chỉnh lại mốc thời gian khi không còn vé confirm (suất trống / đã hết giờ)
            if (!hasConfirmedTickets) {
                OffsetDateTime endTime = showtime.getEndTime();
                OffsetDateTime startTime = showtime.getStartTime();
                if (endTime == null || endTime.isAfter(now)) {
                    showtime.setEndTime(now);
                    endTime = now;
                }
                if (startTime != null && startTime.isAfter(endTime)) {
                    showtime.setStartTime(endTime);
                }
            }
        }

        showtime.setStatus(newStatus);
        Showtime updatedShowtime = showtimeRepository.save(showtime);

        Movie movie = movieRepository.findById(updatedShowtime.getMovieUuid()).orElse(null);
        CinemaRoom room = cinemaRoomRepository.findById(updatedShowtime.getCinemaRoomUuid()).orElse(null);

        return toShowtimeResponse(updatedShowtime, movie, room);
    }

    /**
     * Hủy hàng loạt suất DRAFT (thường do auto-generate). Không đụng suất đang mở bán.
     * Dùng UPDATE thay DELETE để tránh lỗi FK.
     */
    @Transactional
    public int cancelAllDraftShowtimes() {
        entityManager.createNativeQuery("""
                DELETE FROM seat_locked sl
                USING showtime st
                WHERE sl.showtime_uuid = st.uuid
                  AND st.status = 'DRAFT'
                """).executeUpdate();

        return entityManager.createNativeQuery("""
                UPDATE showtime
                SET status = 'CANCELLED'
                WHERE status = 'DRAFT'
                """).executeUpdate();
    }

    @Transactional
    public int cancelFutureActiveShowtimesForRoom(UUID roomUuid) {
        List<Showtime> showtimes = showtimeRepository.findFutureActiveShowtimesByRoom(roomUuid, OffsetDateTime.now());
        int cancelled = 0;
        for (Showtime showtime : showtimes) {
            if (showtime.getStatus() == ShowtimeStatus.CANCELLED
                    || showtime.getStatus() == ShowtimeStatus.FINISHED) {
                continue;
            }
            updateShowtimeStatus(showtime.getUuid(), ShowtimeStatus.CANCELLED);
            cancelled++;
        }
        return cancelled;
    }

    @Transactional
    public int finishExpiredShowtimes() {
        OffsetDateTime now = OffsetDateTime.now();
        List<ShowtimeStatus> activeStatuses = List.of(
                ShowtimeStatus.SCHEDULED,
                ShowtimeStatus.OPEN_FOR_BOOKING,
                ShowtimeStatus.SOLD_OUT);

        entityManager.createNativeQuery("""
                DELETE FROM seat_locked sl
                USING showtime st
                WHERE sl.showtime_uuid = st.uuid
                  AND st.end_time <= :now
                  AND st.status IN ('SCHEDULED', 'OPEN_FOR_BOOKING', 'SOLD_OUT', 'DRAFT')
                """)
                .setParameter("now", now)
                .executeUpdate();

        // Repair chỉ với suất FINISHED không còn vé confirm — tránh sửa giờ làm lệch vé khách
        entityManager.createNativeQuery("""
                UPDATE showtime st
                SET end_time = :now,
                    start_time = CASE
                        WHEN st.start_time > :now THEN :now
                        ELSE st.start_time
                    END
                WHERE st.status = 'FINISHED'
                  AND st.end_time > :now
                  AND NOT EXISTS (
                      SELECT 1 FROM booking b
                      WHERE b.showtime_uuid = st.uuid
                        AND upper(b.status) = 'CONFIRMED'
                  )
                """)
                .setParameter("now", now)
                .executeUpdate();

        // Clear locks on already-finished/cancelled showtimes (leftover holds only)
        entityManager.createNativeQuery("""
                DELETE FROM seat_locked sl
                USING showtime st
                WHERE sl.showtime_uuid = st.uuid
                  AND st.status IN ('FINISHED', 'CANCELLED')
                """)
                .executeUpdate();

        int cancelledDrafts = showtimeRepository.cancelExpiredDrafts(
                now, ShowtimeStatus.DRAFT, ShowtimeStatus.CANCELLED);
        int finished = showtimeRepository.markFinishedIfExpired(now, activeStatuses, ShowtimeStatus.FINISHED);
        return finished + cancelledDrafts;
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getAdminShowtimes() {
        List<Showtime> showtimes = showtimeRepository.findAllOrderByStartTimeDesc();
        return mapShowtimesToResponses(showtimes);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getPublicShowtimes(UUID cinemaUuid, LocalDate date) {
        OffsetDateTime now = OffsetDateTime.now();
        List<ShowtimeStatus> statuses = List.of(ShowtimeStatus.OPEN_FOR_BOOKING, ShowtimeStatus.SOLD_OUT);
        List<Showtime> showtimes;

        if (cinemaUuid != null && date != null) {
            OffsetDateTime rangeStart = toDayStart(date);
            OffsetDateTime rangeEnd = toDayStart(date.plusDays(1));
            showtimes = showtimeRepository.findUpcomingByCinemaAndDateRange(
                    statuses, now, cinemaUuid, rangeStart, rangeEnd);
        } else if (cinemaUuid != null) {
            showtimes = showtimeRepository.findUpcomingByCinema(statuses, now, cinemaUuid);
        } else if (date != null) {
            OffsetDateTime rangeStart = toDayStart(date);
            OffsetDateTime rangeEnd = toDayStart(date.plusDays(1));
            showtimes = showtimeRepository.findUpcomingByDateRange(statuses, now, rangeStart, rangeEnd);
        } else {
            showtimes = showtimeRepository.findUpcomingPublic(statuses, now);
        }
        return mapShowtimesToResponses(showtimes);
    }

    @Transactional(readOnly = true)
    public Optional<ShowtimeResponse> getShowtimeSummary(UUID showtimeUuid) {
        return showtimeRepository.findById(showtimeUuid)
                .map(st -> mapShowtimesToResponses(List.of(st)))
                .filter(list -> !list.isEmpty())
                .map(list -> list.get(0));
    }

    private OffsetDateTime toDayStart(LocalDate date) {
        return AppTimeZones.dayStart(date);
    }

    private List<ShowtimeResponse> mapShowtimesToResponses(List<Showtime> showtimes) {
        if (showtimes.isEmpty()) {
            return List.of();
        }

        Set<UUID> movieUuids = showtimes.stream().map(Showtime::getMovieUuid).collect(Collectors.toSet());
        Set<UUID> roomUuids = showtimes.stream().map(Showtime::getCinemaRoomUuid).collect(Collectors.toSet());

        Map<UUID, Movie> movieMap = movieRepository.findAllByIdWithMedias(movieUuids).stream()
                .collect(Collectors.toMap(Movie::getUuid, m -> m));
        Map<UUID, CinemaRoom> roomMap = cinemaRoomRepository.findAllByIdWithCinema(roomUuids).stream()
                .collect(Collectors.toMap(CinemaRoom::getUuid, r -> r));

        return showtimes.stream()
                .map(st -> toShowtimeResponse(
                        st,
                        movieMap.get(st.getMovieUuid()),
                        roomMap.get(st.getCinemaRoomUuid())))
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
        String moviePosterUrl = S3MediaBorderUtils.toBorderUrl(resolvePrimaryMediaUrl(movie));
        String roomName = room != null ? room.getName() : "Unknown Room";
        String cinemaName = (room != null && room.getCinema() != null) ? room.getCinema().getName() : "Unknown Cinema";
        UUID cinemaUuid = (room != null && room.getCinema() != null) ? room.getCinema().getUuid() : null;

        ShowtimeResponse response = new ShowtimeResponse(
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
        response.setCinemaUuid(cinemaUuid);
        return response;
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

        ShowtimeSchedulingSettings settings = ShowtimeSchedulingSettings.merge(
                systemConfigService.getConfig(), request);

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startRange = AppTimeZones.dayStart(request.getStartDate());
        OffsetDateTime endRange = AppTimeZones.dayStart(request.getEndDate().plusDays(1));

        List<Showtime> existingShowtimes = showtimeRepository.findActiveShowtimesInRooms(
                request.getRoomUuids(), startRange, endRange, now);

        return showtimeSchedulingEngine.generatePreview(
                request,
                settings,
                selectedMovies,
                selectedRooms,
                existingShowtimes,
                this::resolvePrimaryMediaUrl);
    }

    @Transactional
    public List<ShowtimeResponse> saveAutoShowtimes(AutoShowtimeSaveRequest saveRequest) {
        if (saveRequest == null || saveRequest.getShowtimes() == null || saveRequest.getShowtimes().isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sach suat chieu trong");
        }

        ShowtimeStatus publishStatus = saveRequest.getPublishStatus();
        if (publishStatus != null
                && publishStatus != ShowtimeStatus.DRAFT
                && publishStatus != ShowtimeStatus.SCHEDULED
                && publishStatus != ShowtimeStatus.OPEN_FOR_BOOKING) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Trang thai xuat ban khong hop le");
        }

        List<ShowtimeResponse> savedList = new ArrayList<>();
        for (ShowtimeRequest req : saveRequest.getShowtimes()) {
            ShowtimeResponse created = createShowtime(req);
            if (publishStatus == null || publishStatus == ShowtimeStatus.DRAFT) {
                savedList.add(created);
                continue;
            }

            ShowtimeResponse scheduled = updateShowtimeStatus(created.getUuid(), ShowtimeStatus.SCHEDULED);
            if (publishStatus == ShowtimeStatus.SCHEDULED) {
                savedList.add(scheduled);
            } else {
                savedList.add(updateShowtimeStatus(scheduled.getUuid(), ShowtimeStatus.OPEN_FOR_BOOKING));
            }
        }
        return savedList;
    }
}
