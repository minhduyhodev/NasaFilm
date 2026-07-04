package com.thdpv.movietheater.cinema.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.cinema.dto.request.CinemaRequest;
import com.thdpv.movietheater.cinema.dto.request.CinemaRoomRequest;
import com.thdpv.movietheater.cinema.dto.request.GenerateSeatMapRequest;
import com.thdpv.movietheater.cinema.dto.request.UpdateSeatRequest;
import com.thdpv.movietheater.cinema.dto.response.CinemaResponse;
import com.thdpv.movietheater.cinema.dto.response.CinemaRoomResponse;
import com.thdpv.movietheater.cinema.dto.response.CinemaWithRoomsResponse;
import com.thdpv.movietheater.cinema.dto.response.SeatResponse;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.entity.Seat;
import com.thdpv.movietheater.cinema.entity.SeatType;
import com.thdpv.movietheater.cinema.repository.CinemaRepository;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.cinema.repository.SeatRepository;
import com.thdpv.movietheater.cinema.repository.SeatTypeRepository;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.service.ShowtimeService;
import java.time.OffsetDateTime;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.enums.SeatStatus;
import com.thdpv.movietheater.cinema.enums.CinemaStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CinemaService {

    private final CinemaRepository cinemaRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatTypeRepository seatTypeRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeService showtimeService;

    @Transactional
    public CinemaResponse createCinema(CinemaRequest request) {
        String nameTrimmed = request.getName().trim();
        if (cinemaRepository.existsByNameIgnoreCase(nameTrimmed)) {
            throw new AppException(ErrorCode.CONFLICT, "Ten rap phim da ton tai");
        }

        Cinema cinema = new Cinema();
        cinema.setName(nameTrimmed);
        cinema.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        cinema.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
        cinema.setEntranceNote(trimOrNull(request.getEntranceNote()));
        cinema.setLatitude(request.getLatitude());
        cinema.setLongitude(request.getLongitude());
        cinema.setStatus(request.getStatus() != null ? request.getStatus() : CinemaStatus.ACTIVE);

        Cinema savedCinema = cinemaRepository.save(cinema);
        return toCinemaResponse(savedCinema);
    }

    @Transactional
    public CinemaResponse updateCinema(UUID cinemaUuid, CinemaRequest request) {
        Cinema cinema = cinemaRepository.findById(cinemaUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai"));

        String nameTrimmed = request.getName().trim();
        if (cinemaRepository.existsByNameIgnoreCaseAndUuidNot(nameTrimmed, cinemaUuid)) {
            throw new AppException(ErrorCode.CONFLICT, "Ten rap phim da ton tai");
        }

        cinema.setName(nameTrimmed);
        cinema.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        cinema.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
        cinema.setEntranceNote(trimOrNull(request.getEntranceNote()));
        cinema.setLatitude(request.getLatitude());
        cinema.setLongitude(request.getLongitude());
        cinema.setStatus(request.getStatus() != null ? request.getStatus() : cinema.getStatus());

        Cinema updatedCinema = cinemaRepository.save(cinema);
        return toCinemaResponse(updatedCinema);
    }

    @Transactional(readOnly = true)
    public Page<CinemaResponse> getCinemas(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), size > 0 ? size : 10,
                Sort.by(Sort.Direction.DESC, "name"));
        Page<Cinema> cinemas;
        if (keyword != null && !keyword.isBlank()) {
            cinemas = cinemaRepository.searchCinemas(keyword.trim(), pageable);
        } else {
            cinemas = cinemaRepository.findAll(pageable);
        }

        List<UUID> cinemaUuids = cinemas.getContent().stream().map(Cinema::getUuid).collect(Collectors.toList());
        Map<UUID, Long> roomCounts = cinemaUuids.isEmpty()
                ? Map.of()
                : cinemaRoomRepository.countRoomsByCinemaUuids(cinemaUuids).stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> (Long) row[1]));

        return cinemas.map(cinema -> toCinemaResponse(cinema, roomCounts.getOrDefault(cinema.getUuid(), 0L).intValue()));
    }

    @Transactional(readOnly = true)
    public List<CinemaWithRoomsResponse> getCinemasWithRooms(String keyword, int page, int size) {
        Page<CinemaResponse> cinemaPage = getCinemas(keyword, page, size);
        List<CinemaResponse> cinemas = cinemaPage.getContent();
        if (cinemas.isEmpty()) {
            return List.of();
        }

        List<UUID> cinemaUuids = cinemas.stream().map(CinemaResponse::getUuid).collect(Collectors.toList());
        Map<UUID, List<CinemaRoomResponse>> roomsByCinema = cinemaRoomRepository
                .findByCinemaUuidInWithCinema(cinemaUuids).stream()
                .map(this::toCinemaRoomResponse)
                .collect(Collectors.groupingBy(CinemaRoomResponse::getCinemaUuid));

        return cinemas.stream()
                .map(cinema -> new CinemaWithRoomsResponse(
                        cinema,
                        roomsByCinema.getOrDefault(cinema.getUuid(), List.of())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CinemaResponse getCinemaDetail(UUID cinemaUuid) {
        Cinema cinema = cinemaRepository.findById(cinemaUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai"));
        return toCinemaResponse(cinema);
    }

    @Transactional
    public CinemaRoomResponse createRoom(UUID cinemaUuid, CinemaRoomRequest request) {
        Cinema cinema = cinemaRepository.findById(cinemaUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai"));

        String roomNameTrimmed = request.getName().trim();
        String roomCodeTrimmed = request.getRoomCode().trim();
        if (cinemaRoomRepository.existsByCinema_UuidAndNameIgnoreCase(cinemaUuid, roomNameTrimmed)) {
            throw new AppException(ErrorCode.CONFLICT, "Ten phong chieu da ton tai trong rap");
        }
        if (cinemaRoomRepository.existsByCinema_UuidAndRoomCodeIgnoreCase(cinemaUuid, roomCodeTrimmed)) {
            throw new AppException(ErrorCode.CONFLICT, "Ma phong chieu da ton tai trong rap");
        }

        CinemaRoom room = new CinemaRoom();
        room.setCinema(cinema);
        room.setRoomCode(roomCodeTrimmed);
        room.setName(roomNameTrimmed);
        room.setCapacity(request.getCapacity() != null ? request.getCapacity() : 0);
        room.setRoomType(request.getRoomType());
        room.setStatus(request.getStatus() != null ? request.getStatus() : CinemaRoomStatus.ACTIVE);

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);
        return toCinemaRoomResponse(savedRoom);
    }

    @Transactional
    public CinemaRoomResponse updateRoom(UUID roomUuid, CinemaRoomRequest request) {
        CinemaRoom room = cinemaRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));

        String roomNameTrimmed = request.getName().trim();
        String roomCodeTrimmed = request.getRoomCode().trim();
        UUID cinemaUuid = room.getCinema().getUuid();

        cinemaRoomRepository.findByCinema_UuidOrderByNameAsc(cinemaUuid).stream()
                .filter(r -> r.getName().equalsIgnoreCase(roomNameTrimmed) && !r.getUuid().equals(roomUuid))
                .findFirst()
                .ifPresent(r -> {
                    throw new AppException(ErrorCode.CONFLICT, "Ten phong chieu da ton tai trong rap");
                });

        if (cinemaRoomRepository.existsByCinema_UuidAndRoomCodeIgnoreCaseAndUuidNot(cinemaUuid, roomCodeTrimmed, roomUuid)) {
            throw new AppException(ErrorCode.CONFLICT, "Ma phong chieu da ton tai trong rap");
        }

        // When disabling/maintenance: cancel future showtimes so room can be taken offline
        if (request.getStatus() != null && request.getStatus() != room.getStatus()) {
            if (request.getStatus() == CinemaRoomStatus.MAINTENANCE || request.getStatus() == CinemaRoomStatus.DISABLED) {
                showtimeService.cancelFutureActiveShowtimesForRoom(roomUuid);
            }
            room.setStatus(request.getStatus());
        }

        room.setRoomCode(roomCodeTrimmed);
        room.setName(roomNameTrimmed);
        room.setCapacity(request.getCapacity() != null ? request.getCapacity() : room.getCapacity());
        if (request.getRoomType() != null) {
            room.setRoomType(request.getRoomType());
        }
        if (request.getLayoutConfig() != null) {
            room.setLayoutConfig(request.getLayoutConfig());
        }

        CinemaRoom updatedRoom = cinemaRoomRepository.save(room);
        return toCinemaRoomResponse(updatedRoom);
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getRoomsByCinema(UUID cinemaUuid) {
        if (!cinemaRepository.existsById(cinemaUuid)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai");
        }
        return cinemaRoomRepository.findByCinema_UuidOrderByNameAsc(cinemaUuid).stream()
                .map(this::toCinemaRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void generateSeats(UUID roomUuid, GenerateSeatMapRequest request) {
        CinemaRoom room = cinemaRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));

        // Fetch existing seats in room to soft-disable or reuse
        List<Seat> existingSeats = seatRepository.findByCinemaRoom_UuidOrderByRowNameAscSeatNumberAsc(roomUuid);

        // Check if there are future active showtimes or confirmed bookings for this room, but only if the room already has active seats
        boolean hasActiveSeats = existingSeats.stream().anyMatch(Seat::isActive);
        if (hasActiveSeats) {
            boolean hasFutureShowtimes = showtimeRepository.existsFutureShowtime(roomUuid, OffsetDateTime.now());
            boolean hasConfirmedBookings = showtimeRepository.existsConfirmedBookingForRoom(roomUuid);
            if (hasFutureShowtimes || hasConfirmedBookings) {
                throw new AppException(ErrorCode.CONFLICT, "Không thể thiết lập lại sơ đồ ghế vì phòng chiếu đang có lịch chiếu sắp tới hoặc vé đã đặt.");
            }
        }

        java.util.Map<String, Seat> existingSeatMap = existingSeats.stream()
                .collect(Collectors.toMap(s -> s.getRowName() + "_" + s.getSeatNumber(), s -> s));

        // Fetch or create standard seat types matching UI defaults
        SeatType normalType = getOrCreateSeatType("STANDARD", "Ghe standard cho rap phim", new BigDecimal("85000"), 1.0);
        SeatType vipType = getOrCreateSeatType("VIP", "Ghe VIP cho rap phim", new BigDecimal("120000"), 1.0);
        SeatType coupleType = getOrCreateSeatType("COUPLE", "Ghe doi cho rap phim", new BigDecimal("160000"), 1.0);

        int rowCount = (request != null && request.getRowCount() != null) ? request.getRowCount() : 8;
        int seatsPerRow = (request != null && request.getSeatsPerRow() != null) ? request.getSeatsPerRow() : 12;

        // Ensure reasonable limits
        if (rowCount <= 0 || rowCount > 26 || seatsPerRow <= 0 || seatsPerRow > 30) {
            throw new AppException(ErrorCode.BAD_REQUEST, "So hang (1-26) hoac so ghe moi hang (1-30) khong hop le");
        }

        List<Seat> seatsToSave = new ArrayList<>();

        // Proportional layout configuration:
        // - Last 1 row (or 2 rows if total rows >= 8) will be Couple seats
        // - Middle rows (from 50% to the Couple rows) will be VIP seats
        // - First rows will be Standard seats
        int coupleRowsCount = 1;
        int vipStartRowIndex = rowCount / 2; // e.g. 8 / 2 = row index 4 (E)
        int coupleStartRowIndex = rowCount - coupleRowsCount; // e.g. 8 - 1 = row index 7 (H)

        for (int r = 0; r < rowCount; r++) {
            char rowChar = (char) ('A' + r);
            String rowStr = String.valueOf(rowChar);

            SeatType type;
            int count = seatsPerRow;

            if (r >= coupleStartRowIndex) {
                type = coupleType;
                count = seatsPerRow; // Couple seats now have the same width and count as standard/VIP seats
            } else if (r >= vipStartRowIndex) {
                type = vipType;
            } else {
                type = normalType;
            }

            for (int i = 1; i <= count; i++) {
                String posKey = rowStr + "_" + i;
                if (existingSeatMap.containsKey(posKey)) {
                    Seat seat = existingSeatMap.get(posKey);
                    seat.setActive(true);
                    if (seat.getStatus() == SeatStatus.DISABLED) {
                        seat.setStatus(SeatStatus.ACTIVE);
                    }
                    seat.setSeatType(type);
                    seatsToSave.add(seat);
                    existingSeatMap.remove(posKey);
                } else {
                    Seat seat = new Seat();
                    String seatKey = room.getUuid().toString() + "_" + rowStr + "_" + i;
                    UUID deterministicUuid = UUID.nameUUIDFromBytes(seatKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    seat.setUuid(deterministicUuid);
                    seat.setCinemaRoom(room);
                    seat.setSeatType(type);
                    seat.setRowName(rowStr);
                    seat.setSeatNumber(i);
                    seat.setStatus(SeatStatus.ACTIVE);
                    seat.setActive(true);
                    seatsToSave.add(seat);
                }
            }
        }

        // Soft-disable any remaining seats that were not in the new layout
        for (Seat remainingSeat : existingSeatMap.values()) {
            remainingSeat.setActive(false);
            remainingSeat.setStatus(SeatStatus.DISABLED);
            seatsToSave.add(remainingSeat);
        }

        seatRepository.saveAll(seatsToSave);

        // Update capacity of room to reflect the actual ACTIVE generated count
        int activeCapacity = (int) seatsToSave.stream().filter(Seat::isActive).count();
        room.setCapacity(activeCapacity);
        cinemaRoomRepository.save(room);
    }

    @Transactional
    public SeatResponse updateSeat(UUID seatUuid, UpdateSeatRequest request) {
        Seat seat = seatRepository.findById(seatUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Ghe khong ton tai"));

        if (request.getSeatTypeUuid() != null) {
            SeatType seatType = seatTypeRepository.findById(request.getSeatTypeUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Loai ghe khong ton tai"));
            seat.setSeatType(seatType);
        }

        if (request.getStatus() != null) {
            seat.setStatus(request.getStatus());
        }

        Seat updatedSeat = seatRepository.save(seat);
        return toSeatResponse(updatedSeat);
    }

    @Transactional(readOnly = true)
    public List<SeatResponse> getSeatsByRoom(UUID roomUuid) {
        if (!cinemaRoomRepository.existsById(roomUuid)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai");
        }
        return seatRepository.findByCinemaRoom_UuidAndIsActiveTrueOrderByRowNameAscSeatNumberAsc(roomUuid).stream()
                .map(this::toSeatResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteRoom(UUID roomUuid) {
        CinemaRoom room = cinemaRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));
        boolean hasFutureShowtimes = showtimeRepository.existsFutureShowtime(roomUuid, OffsetDateTime.now());
        boolean hasConfirmedBookings = showtimeRepository.existsConfirmedBookingForRoom(roomUuid);
        if (hasFutureShowtimes || hasConfirmedBookings) {
            throw new AppException(ErrorCode.CONFLICT,
                    "Khong the xoa phong chieu vi dang co lich chieu hoac ve da dat");
        }
        if (room.getStatus() == CinemaRoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.CONFLICT,
                    "Chi co the xoa phong chieu dang bao tri hoac vo hieu hoa");
        }
        seatRepository.deleteByCinemaRoomUuid(roomUuid);
        cinemaRoomRepository.delete(room);
    }

    @Transactional
    public void deleteCinema(UUID cinemaUuid) {
        Cinema cinema = cinemaRepository.findById(cinemaUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai"));

        for (CinemaRoom room : cinema.getCinemaRooms()) {
            boolean hasFutureShowtimes = showtimeRepository.existsFutureShowtime(room.getUuid(), OffsetDateTime.now());
            boolean hasConfirmedBookings = showtimeRepository.existsConfirmedBookingForRoom(room.getUuid());
            if (hasFutureShowtimes || hasConfirmedBookings) {
                throw new AppException(ErrorCode.CONFLICT, 
                        "Khong the xoa rap vi phong chieu " + room.getName() + " dang co lich chieu hoac ve da dat");
            }
        }
        
        if (cinema.getStatus() == CinemaStatus.ACTIVE) {
            throw new AppException(ErrorCode.CONFLICT, 
                    "Chi co the xoa rap chieu dang bao tri hoac vo hieu hoa");
        }

        for (CinemaRoom room : cinema.getCinemaRooms()) {
            seatRepository.deleteByCinemaRoomUuid(room.getUuid());
        }
        cinemaRepository.delete(cinema);
    }

    private SeatResponse toSeatResponse(Seat seat) {
        return new SeatResponse(
                seat.getUuid(),
                seat.getRowName(),
                seat.getSeatNumber(),
                seat.getStatus(),
                seat.getSeatType().getUuid(),
                seat.getSeatType().getName()
        );
    }

    private SeatType getOrCreateSeatType(String name, String description, BigDecimal basePrice, Double modifier) {
        return seatTypeRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> {
                    SeatType newType = new SeatType();
                    if ("STANDARD".equalsIgnoreCase(name)) {
                        newType.setUuid(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
                    } else if ("VIP".equalsIgnoreCase(name)) {
                        newType.setUuid(UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));
                    } else if ("COUPLE".equalsIgnoreCase(name)) {
                        newType.setUuid(UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"));
                    }
                    newType.setName(name.toUpperCase());
                    newType.setDescription(description);
                    newType.setBasePrice(basePrice);
                    newType.setPriceModifier(BigDecimal.valueOf(modifier));
                    return seatTypeRepository.save(newType);
                });
    }

    private CinemaResponse toCinemaResponse(Cinema cinema) {
        return toCinemaResponse(cinema, cinema.getCinemaRooms() != null ? cinema.getCinemaRooms().size() : 0);
    }

    private CinemaResponse toCinemaResponse(Cinema cinema, int totalRooms) {
        CinemaResponse response = new CinemaResponse(
                cinema.getUuid(),
                cinema.getName(),
                cinema.getAddress(),
                cinema.getPhoneNumber(),
                totalRooms);
        response.setEntranceNote(cinema.getEntranceNote());
        response.setLatitude(cinema.getLatitude());
        response.setLongitude(cinema.getLongitude());
        response.setStatus(cinema.getStatus());
        return response;
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private CinemaRoomResponse toCinemaRoomResponse(CinemaRoom room) {
        return new CinemaRoomResponse(
                room.getUuid(),
                room.getRoomCode(),
                room.getName(),
                room.getCapacity(),
                room.getRoomType(),
                room.getStatus(),
                room.getCinema().getUuid(),
                room.getCinema().getName(),
                room.getLayoutConfig());
    }
}
