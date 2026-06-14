package com.thdpv.movietheater.cinema.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.cinema.dto.request.CinemaRequest;
import com.thdpv.movietheater.cinema.dto.request.CinemaRoomRequest;
import com.thdpv.movietheater.cinema.dto.request.GenerateSeatMapRequest;
import com.thdpv.movietheater.cinema.dto.request.UpdateSeatRequest;
import com.thdpv.movietheater.cinema.dto.response.CinemaResponse;
import com.thdpv.movietheater.cinema.dto.response.CinemaRoomResponse;
import com.thdpv.movietheater.cinema.dto.response.SeatResponse;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.entity.Seat;
import com.thdpv.movietheater.cinema.entity.SeatType;
import com.thdpv.movietheater.cinema.repository.CinemaRepository;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.cinema.repository.SeatRepository;
import com.thdpv.movietheater.cinema.repository.SeatTypeRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.enums.SeatStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CinemaService {

    private final CinemaRepository cinemaRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatTypeRepository seatTypeRepository;
    private final SeatRepository seatRepository;

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

        Cinema savedCinema = cinemaRepository.save(cinema);
        return toCinemaResponse(savedCinema);
    }

    @Transactional
    public CinemaResponse updateCinema(UUID cinemaUuid, CinemaRequest request) {
        Cinema cinema = cinemaRepository.findById(cinemaUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai"));

        String nameTrimmed = request.getName().trim();
        cinemaRepository.existsByNameIgnoreCase(nameTrimmed);

        cinemaRepository.findAll().stream()
                .filter(c -> c.getName().equalsIgnoreCase(nameTrimmed) && !c.getUuid().equals(cinemaUuid))
                .findFirst()
                .ifPresent(c -> {
                    throw new AppException(ErrorCode.CONFLICT, "Ten rap phim da ton tai");
                });

        cinema.setName(nameTrimmed);
        cinema.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        cinema.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);

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
        return cinemas.map(this::toCinemaResponse);
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
        if (cinemaRoomRepository.existsByCinema_UuidAndNameIgnoreCase(cinemaUuid, roomNameTrimmed)) {
            throw new AppException(ErrorCode.CONFLICT, "Phong chieu nay da ton tai trong rap");
        }

        CinemaRoom room = new CinemaRoom();
        room.setCinema(cinema);
        room.setName(roomNameTrimmed);
        room.setCapacity(request.getCapacity() != null ? request.getCapacity() : 0);
        room.setStatus(request.getStatus() != null ? request.getStatus() : CinemaRoomStatus.ACTIVE);

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);
        return toCinemaRoomResponse(savedRoom);
    }

    @Transactional
    public CinemaRoomResponse updateRoom(UUID roomUuid, CinemaRoomRequest request) {
        CinemaRoom room = cinemaRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));

        String roomNameTrimmed = request.getName().trim();
        UUID cinemaUuid = room.getCinema().getUuid();

        cinemaRoomRepository.findByCinema_UuidOrderByNameAsc(cinemaUuid).stream()
                .filter(r -> r.getName().equalsIgnoreCase(roomNameTrimmed) && !r.getUuid().equals(roomUuid))
                .findFirst()
                .ifPresent(r -> {
                    throw new AppException(ErrorCode.CONFLICT, "Phong chieu nay da ton tai trong rap");
                });

        room.setName(roomNameTrimmed);
        room.setCapacity(request.getCapacity() != null ? request.getCapacity() : room.getCapacity());
        if (request.getStatus() != null) {
            room.setStatus(request.getStatus());
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

        // Delete any existing seats to reset
        seatRepository.deleteByCinemaRoomUuid(roomUuid);

        // Fetch or create standard seat types matching UI defaults
        SeatType normalType = getOrCreateSeatType("Ghế Thường", "Ghe standard cho rap phim", new BigDecimal("85000"), 1.0);
        SeatType vipType = getOrCreateSeatType("Ghế VIP", "Ghe VIP cho rap phim", new BigDecimal("120000"), 1.0);
        SeatType coupleType = getOrCreateSeatType("Ghế Đôi", "Ghe doi cho rap phim", new BigDecimal("160000"), 1.0);

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
        int coupleRowsCount = (rowCount >= 8) ? 2 : 1;
        int vipStartRowIndex = rowCount / 2; // e.g. 8 / 2 = row index 4 (E)
        int coupleStartRowIndex = rowCount - coupleRowsCount; // e.g. 8 - 2 = row index 6 (G)

        for (int r = 0; r < rowCount; r++) {
            char rowChar = (char) ('A' + r);
            String rowStr = String.valueOf(rowChar);

            SeatType type;
            int count = seatsPerRow;

            if (r >= coupleStartRowIndex) {
                type = coupleType;
                count = seatsPerRow / 2; // Couple seats take twice the width, so we generate half as many
                if (count == 0) count = 1; // Ensure at least 1 seat
            } else if (r >= vipStartRowIndex) {
                type = vipType;
            } else {
                type = normalType;
            }

            for (int i = 1; i <= count; i++) {
                Seat seat = new Seat();
                String seatKey = room.getUuid().toString() + "_" + rowStr + "_" + i;
                UUID deterministicUuid = UUID.nameUUIDFromBytes(seatKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                seat.setUuid(deterministicUuid);
                seat.setCinemaRoom(room);
                seat.setSeatType(type);
                seat.setRowName(rowStr);
                seat.setSeatNumber(i);
                seat.setStatus(SeatStatus.ACTIVE);
                seatsToSave.add(seat);
            }
        }

        seatRepository.saveAll(seatsToSave);

        // Update capacity of room to reflect the actual generated count
        room.setCapacity(seatsToSave.size());
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
        return seatRepository.findByCinemaRoom_UuidOrderByRowNameAscSeatNumberAsc(roomUuid).stream()
                .map(this::toSeatResponse)
                .collect(Collectors.toList());
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
                    newType.setName(name);
                    newType.setDescription(description);
                    newType.setBasePrice(basePrice);
                    newType.setPriceModifier(BigDecimal.valueOf(modifier));
                    return seatTypeRepository.save(newType);
                });
    }

    private CinemaResponse toCinemaResponse(Cinema cinema) {
        return new CinemaResponse(
                cinema.getUuid(),
                cinema.getName(),
                cinema.getAddress(),
                cinema.getPhoneNumber(),
                cinema.getCinemaRooms() != null ? cinema.getCinemaRooms().size() : 0);
    }

    private CinemaRoomResponse toCinemaRoomResponse(CinemaRoom room) {
        return new CinemaRoomResponse(
                room.getUuid(),
                room.getName(),
                room.getCapacity(),
                room.getStatus(),
                room.getCinema().getUuid(),
                room.getCinema().getName());
    }
}
