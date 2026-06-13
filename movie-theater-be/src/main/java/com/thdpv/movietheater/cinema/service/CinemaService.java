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
import com.thdpv.movietheater.cinema.dto.response.CinemaResponse;
import com.thdpv.movietheater.cinema.dto.response.CinemaRoomResponse;
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
        room.setStatus(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE");

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);
        return toCinemaRoomResponse(savedRoom);
    }

    @Transactional
    public CinemaRoomResponse updateRoom(UUID roomUuid, CinemaRoomRequest request) {
        CinemaRoom room = cinemaRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));

        String roomNameTrimmed = request.getName().trim();
        UUID cinemaUuid = room.getCinema().getUuid();

        cinemaRoomRepository.findByCinema_UuidOrderByCreatedAtAsc(cinemaUuid).stream()
                .filter(r -> r.getName().equalsIgnoreCase(roomNameTrimmed) && !r.getUuid().equals(roomUuid))
                .findFirst()
                .ifPresent(r -> {
                    throw new AppException(ErrorCode.CONFLICT, "Phong chieu nay da ton tai trong rap");
                });

        room.setName(roomNameTrimmed);
        room.setCapacity(request.getCapacity() != null ? request.getCapacity() : room.getCapacity());
        if (request.getStatus() != null) {
            room.setStatus(request.getStatus().trim().toUpperCase());
        }

        CinemaRoom updatedRoom = cinemaRoomRepository.save(room);
        return toCinemaRoomResponse(updatedRoom);
    }

    @Transactional(readOnly = true)
    public List<CinemaRoomResponse> getRoomsByCinema(UUID cinemaUuid) {
        if (!cinemaRepository.existsById(cinemaUuid)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Rap phim khong ton tai");
        }
        return cinemaRoomRepository.findByCinema_UuidOrderByCreatedAtAsc(cinemaUuid).stream()
                .map(this::toCinemaRoomResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void generateNasaStandardSeats(UUID roomUuid) {
        CinemaRoom room = cinemaRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Phong chieu khong ton tai"));

        // Delete any existing seats to reset
        seatRepository.deleteByCinemaRoomUuid(roomUuid);

        // Fetch or create standard seat types matching UI defaults
        SeatType normalType = getOrCreateSeatType("Ghế Thường", "Ghe standard cho rap phim", new BigDecimal("85000"),
                1.0);
        SeatType vipType = getOrCreateSeatType("Ghế VIP", "Ghe VIP cho rap phim", new BigDecimal("120000"), 1.0);
        SeatType coupleType = getOrCreateSeatType("Ghế Đôi", "Ghe doi cho rap phim", new BigDecimal("160000"), 1.0);

        char[] rows = { 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H' };
        List<Seat> seatsToSave = new ArrayList<>();

        for (char row : rows) {
            String rowStr = String.valueOf(row);
            int count = (row == 'G' || row == 'H') ? 6 : 12; // 6 for couples, 12 for standard/VIP
            SeatType type;

            if (row >= 'A' && row <= 'D') {
                type = normalType;
            } else if (row >= 'E' && row <= 'F') {
                type = vipType;
            } else {
                type = coupleType;
            }

            for (int i = 1; i <= count; i++) {
                Seat seat = new Seat();
                seat.setCinemaRoom(room);
                seat.setSeatType(type);
                seat.setRowName(rowStr);
                seat.setSeatNumber(i);
                seat.setStatus("AVAILABLE");
                seatsToSave.add(seat);
            }
        }

        seatRepository.saveAll(seatsToSave);

        // Update capacity of room to reflect the actual generated count
        room.setCapacity(seatsToSave.size());
        cinemaRoomRepository.save(room);
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
