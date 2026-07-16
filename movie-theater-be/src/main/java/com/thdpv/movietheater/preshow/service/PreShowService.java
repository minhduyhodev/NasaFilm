package com.thdpv.movietheater.preshow.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.BookingSeat;
import com.thdpv.movietheater.booking.entity.Ticket;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.entity.Seat;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.cache.CacheNames;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.orbit.util.OrbitSeatJson;
import com.thdpv.movietheater.preshow.dto.TheaterBoardingContext;
import com.thdpv.movietheater.preshow.dto.response.BoardingPassResponse;
import com.thdpv.movietheater.preshow.enums.PreShowRitualStatus;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class PreShowService {

    private static final int MEMBER_VIP_SCORE = 10000;
    private static final int MEMBER_FRIEND_SCORE = 5000;
    private static final DateTimeFormatter SHOWTIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm · dd/MM/yyyy");

    @Value("${app.pre-show.notify-minutes-before:60}")
    private int notifyMinutesBefore;

    @Value("${app.pre-show.boarding-soon-minutes:15}")
    private int boardingSoonMinutes;

    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;
    private final TicketRepository ticketRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final UserRepository userRepository;
    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitMemberRepository orbitMemberRepository;

    public PreShowService(
            BookingRepository bookingRepository,
            MovieRepository movieRepository,
            TicketRepository ticketRepository,
            BookingSeatRepository bookingSeatRepository,
            UserRepository userRepository,
            OrbitRoomRepository orbitRoomRepository,
            OrbitMemberRepository orbitMemberRepository) {
        this.bookingRepository = bookingRepository;
        this.movieRepository = movieRepository;
        this.ticketRepository = ticketRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.userRepository = userRepository;
        this.orbitRoomRepository = orbitRoomRepository;
        this.orbitMemberRepository = orbitMemberRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(
            value = CacheNames.BOARDING_PASS,
            key = "#bookingUuid + ':' + #userEmail.toLowerCase()")
    public BoardingPassResponse getBoardingPass(UUID bookingUuid, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Người dùng chưa đăng nhập"));

        TheaterBoardingContext context = bookingRepository.findTheaterBoardingContext(bookingUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy đơn đặt vé"));

        if (!context.userUuid().equals(user.getId())) {
            boolean orbitMemberAllowed = orbitRoomRepository.findByBookingUuid(bookingUuid)
                    .flatMap(room -> orbitMemberRepository.findByRoomUuidAndUserUuid(room.getUuid(), user.getId()))
                    .isPresent();
            if (!orbitMemberAllowed) {
                throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem thẻ lên máy bay này");
            }
        }

        Set<UUID> memberSeatUuids = resolveOrbitMemberSeatFilter(bookingUuid, user.getId(), context.userUuid());

        if (isOnlineBooking(context.bookingType())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Thẻ lên máy bay chỉ áp dụng cho vé rạp chiếu");
        }

        if (!"CONFIRMED".equalsIgnoreCase(context.bookingStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Đơn đặt vé không còn hiệu lực");
        }

        Movie movie = movieRepository.findAllByIdWithMedias(List.of(context.movieUuid())).stream()
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        List<Ticket> tickets = filterTicketsForMember(
                ticketRepository.findByBookingUuid(bookingUuid), bookingUuid, memberSeatUuids);
        List<String> seatLabels = loadSeatLabels(bookingUuid, memberSeatUuids);
        String primaryTicketCode = tickets.stream()
                .map(Ticket::getTicketCode)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("");

        boolean checkedIn = tickets.stream().anyMatch(t -> t.getCheckedInAt() != null);

        OffsetDateTime startTime = context.showtimeStart().withOffsetSameInstant(ZoneOffset.ofHours(7));
        OffsetDateTime endTime = context.showtimeEnd() != null
                ? context.showtimeEnd().withOffsetSameInstant(ZoneOffset.ofHours(7))
                : startTime.plusHours(2);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.ofHours(7));
        PreShowRitualStatus ritualStatus = resolveRitualStatus(startTime, endTime, now);

        Cinema cinema = new Cinema();
        cinema.setName(context.cinemaName());
        cinema.setAddress(context.cinemaAddress());
        cinema.setEntranceNote(context.entranceNote());
        cinema.setLatitude(context.cinemaLatitude());
        cinema.setLongitude(context.cinemaLongitude());

        CinemaRoom room = new CinemaRoom();
        room.setName(context.roomName());

        BoardingPassResponse response = new BoardingPassResponse();
        response.setBookingUuid(bookingUuid);
        response.setMissionCode(buildMissionCode(bookingUuid));
        response.setMovieTitle(movie.getTitle());
        response.setPosterUrl(resolvePrimaryPosterUrl(movie));
        response.setShowtimeStart(startTime);
        response.setShowtimeEnd(endTime);
        response.setShowtimeDisplay(startTime.format(SHOWTIME_FORMAT));
        response.setLaunchPadName(cinema.getName());
        response.setCinemaAddress(cinema.getAddress());
        response.setEntranceNote(cinema.getEntranceNote());
        response.setChamberLabel(buildChamberLabel(room));
        response.setSeatLabels(seatLabels);
        response.setCrewAssignment(buildCrewAssignment(seatLabels));
        response.setPrimaryTicketCode(primaryTicketCode);
        response.setQrData(primaryTicketCode);
        response.setMapsUrl(buildMapsUrl(cinema));
        response.setBoardingPassPath("/pre-show/boarding/" + bookingUuid);
        response.setRitualStatus(ritualStatus.name());
        response.setRitualStatusLabel(ritualStatus.getLabel());
        response.setCheckedIn(checkedIn);
        applyMemberTier(response, context.userScore());
        return response;
    }

    public PreShowRitualStatus resolveRitualStatus(OffsetDateTime startTime, OffsetDateTime endTime, OffsetDateTime now) {
        if (now.isAfter(endTime)) {
            return PreShowRitualStatus.COMPLETE;
        }
        if (!now.isBefore(startTime)) {
            return PreShowRitualStatus.SHOWING;
        }
        long minutesUntil = Duration.between(now, startTime).toMinutes();
        if (minutesUntil <= boardingSoonMinutes) {
            return PreShowRitualStatus.BOARDING;
        }
        if (minutesUntil <= notifyMinutesBefore) {
            return PreShowRitualStatus.SOON;
        }
        return PreShowRitualStatus.PREPARE;
    }

    public String buildMapsUrl(Cinema cinema) {
        if (cinema == null) {
            return null;
        }
        if (cinema.getLatitude() != null && cinema.getLongitude() != null) {
            return "https://maps.google.com/?q=" + cinema.getLatitude() + "," + cinema.getLongitude();
        }
        String query = ((cinema.getName() != null ? cinema.getName() : "") + " "
                + (cinema.getAddress() != null ? cinema.getAddress() : "")).trim();
        if (query.isEmpty()) {
            return null;
        }
        return "https://maps.google.com/?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
    }

    public String buildMissionCode(UUID bookingUuid) {
        return "NF-" + bookingUuid.toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private boolean isOnlineBooking(String bookingType) {
        return bookingType != null && "ONLINE".equalsIgnoreCase(bookingType);
    }

    private List<String> loadSeatLabels(UUID bookingUuid) {
        return loadSeatLabels(bookingUuid, null);
    }

    private List<String> loadSeatLabels(UUID bookingUuid, Set<UUID> allowedSeatUuids) {
        return bookingSeatRepository.findSeatsByBookingUuid(bookingUuid).stream()
                .filter(seat -> allowedSeatUuids == null || allowedSeatUuids.contains(seat.getUuid()))
                .map(seat -> seat.getRowName() + seat.getSeatNumber())
                .toList();
    }

    private Set<UUID> resolveOrbitMemberSeatFilter(UUID bookingUuid, UUID viewerUuid, UUID bookingOwnerUuid) {
        if (viewerUuid.equals(bookingOwnerUuid)) {
            return null;
        }
        return orbitRoomRepository.findByBookingUuid(bookingUuid)
                .flatMap(room -> orbitMemberRepository.findByRoomUuidAndUserUuid(room.getUuid(), viewerUuid))
                .map(member -> new HashSet<>(OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson())))
                .orElse(new HashSet<>());
    }

    private List<Ticket> filterTicketsForMember(
            List<Ticket> tickets, UUID bookingUuid, Set<UUID> memberSeatUuids) {
        if (memberSeatUuids == null) {
            return tickets;
        }
        Set<UUID> allowedBookingSeatUuids = bookingSeatRepository.findByBookingUuid(bookingUuid).stream()
                .filter(bs -> memberSeatUuids.contains(bs.getSeatUuid()))
                .map(BookingSeat::getUuid)
                .collect(Collectors.toSet());
        return tickets.stream()
                .filter(ticket -> allowedBookingSeatUuids.contains(ticket.getBookingSeatUuid()))
                .toList();
    }

    public String buildCrewAssignment(List<String> seatLabels) {
        if (seatLabels == null || seatLabels.isEmpty()) {
            return "—";
        }
        Map<String, List<Integer>> rowSeats = new LinkedHashMap<>();
        for (String label : seatLabels) {
            if (label == null || label.isBlank()) {
                continue;
            }
            String row = label.replaceAll("\\d+$", "");
            String numberPart = label.substring(row.length());
            try {
                int seatNumber = Integer.parseInt(numberPart);
                rowSeats.computeIfAbsent(row, key -> new ArrayList<>()).add(seatNumber);
            } catch (NumberFormatException ex) {
                return String.join(", ", seatLabels);
            }
        }
        if (rowSeats.size() == 1) {
            Map.Entry<String, List<Integer>> entry = rowSeats.entrySet().iterator().next();
            String row = entry.getKey();
            List<Integer> numbers = entry.getValue().stream().sorted().toList();
            if (numbers.size() == 1) {
                return "Khoang " + row + " · Ghế " + row + numbers.get(0);
            }
            return "Khoang " + row + " · Ghế " + row + numbers.get(0) + "–" + row + numbers.get(numbers.size() - 1);
        }
        return seatLabels.stream().collect(Collectors.joining(", "));
    }

    private String buildChamberLabel(CinemaRoom room) {
        if (room == null || room.getName() == null || room.getName().isBlank()) {
            return "Buồng chiếu";
        }
        String digits = room.getName().replaceAll("\\D+", "");
        if (!digits.isBlank()) {
            return "Buồng chiếu " + digits;
        }
        return "Buồng chiếu " + room.getName();
    }

    private void applyMemberTier(BoardingPassResponse response, Integer score) {
        int safeScore = score != null ? score : 0;
        if (safeScore >= MEMBER_VIP_SCORE) {
            response.setMemberTierLabel("NASA'VIP");
            response.setMemberTierBadge("Phi hành đoàn ưu tiên");
            return;
        }
        if (safeScore >= MEMBER_FRIEND_SCORE) {
            response.setMemberTierLabel("NASA'FRIEND");
            response.setMemberTierBadge("Phi hành đoàn thân thiết");
        }
    }

    private String resolvePrimaryPosterUrl(Movie movie) {
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
}
