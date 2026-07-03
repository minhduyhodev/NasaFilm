package com.thdpv.movietheater.orbit.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.SyncSeatLockRequest;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.LockedSeat;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.service.SeatMapEventPublisher;
import com.thdpv.movietheater.booking.service.ShowtimeSeatService;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.mission.dto.MissionEventPayload;
import com.thdpv.movietheater.mission.dto.response.MissionCompletionResponse;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.dto.OrbitBookingCompletionResult;
import com.thdpv.movietheater.orbit.dto.request.CreateOrbitRoomRequest;
import com.thdpv.movietheater.orbit.dto.request.UpdateOrbitMemberSeatsRequest;
import com.thdpv.movietheater.orbit.dto.response.OrbitCheckoutPrepareResponse;
import com.thdpv.movietheater.orbit.dto.response.OrbitMemberResponse;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.entity.OrbitMember;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.orbit.util.OrbitSeatJson;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrbitRoomService {

    private static final List<OrbitRoomStatus> ACTIVE_STATUSES = List.of(
            OrbitRoomStatus.OPEN,
            OrbitRoomStatus.LOCKED,
            OrbitRoomStatus.CHECKOUT);

    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitMemberRepository orbitMemberRepository;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatService showtimeSeatService;
    private final BookingNativeRepository bookingNativeRepository;
    private final MissionService missionService;
    private final SystemConfigService systemConfigService;
    private final OrbitRoomBroadcaster orbitRoomBroadcaster;
    private final SeatMapEventPublisher seatMapEventPublisher;

    @Value("${app.orbit.enabled:true}")
    private boolean orbitEnabled;

    @Value("${app.orbit.room.ttl-minutes:30}")
    private int roomTtlMinutes;

    @Value("${app.orbit.checkout.ttl-minutes:15}")
    private int checkoutTtlMinutes;

    @Transactional
    public OrbitRoomResponse createRoom(String currentUserEmail, CreateOrbitRoomRequest request) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        Showtime showtime = loadOpenShowtime(request.getShowtimeUuid(), now);

        int maxMembers = clampMaxMembers(request.getMaxMembers());
        OffsetDateTime expiresAt = now.plusMinutes(roomTtlMinutes);

        OrbitRoom room = new OrbitRoom();
        room.setUuid(UUID.randomUUID());
        room.setShowtimeUuid(showtime.getUuid());
        room.setHostUserUuid(hostUuid);
        room.setMaxMembers(maxMembers);
        room.setStatus(OrbitRoomStatus.OPEN);
        room.setExpiresAt(expiresAt);
        room.setCreatedAt(now);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);

        User host = userRepository.findById(hostUuid).orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        OrbitMember hostMember = buildMember(room.getUuid(), host, now);
        orbitMemberRepository.save(hostMember);

        missionService.handleOrbitRoomJoined(hostUuid, room.getUuid(), now);
        orbitRoomBroadcaster.notifyRoomUpdated(room.getUuid());
        return toRoomResponse(room, hostUuid);
    }

    @Transactional
    public OrbitRoomResponse joinRoom(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = loadJoinableRoom(roomUuid, now);

        if (orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid).isPresent()) {
            return toRoomResponse(room, userUuid);
        }

        long memberCount = orbitMemberRepository.countByRoomUuid(roomUuid);
        if (memberCount >= room.getMaxMembers()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit da du day");
        }

        User user = userRepository.findById(userUuid).orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        OrbitMember member = buildMember(roomUuid, user, now);
        orbitMemberRepository.save(member);

        missionService.handleOrbitRoomJoined(userUuid, roomUuid, now);
        touchRoom(room, now);
        orbitRoomBroadcaster.notifyRoomUpdated(roomUuid);
        return toRoomResponse(room, userUuid);
    }

    @Transactional
    public OrbitRoomResponse leaveRoom(String currentUserEmail, UUID roomUuid) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khong tim thay phong Orbit"));

        if (room.getHostUserUuid().equals(userUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Host khong the roi phong. Hay huy phong neu can.");
        }
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit khong con o trang thai cho phep roi");
        }

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Ban khong o trong phong nay"));

        List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
        if (!seatUuids.isEmpty()) {
            bookingNativeRepository.deleteSeatLocks(room.getShowtimeUuid(), userUuid, seatUuids);
            seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        }

        missionService.rollbackSourceProgress(userUuid, roomUuid.toString(), now);
        orbitMemberRepository.delete(member);
        touchRoom(room, now);
        orbitRoomBroadcaster.notifyRoomUpdated(roomUuid);
        return toRoomResponse(room, userUuid);
    }

    @Transactional(readOnly = true)
    public OrbitRoomResponse getRoom(String currentUserEmail, UUID roomUuid) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khong tim thay phong Orbit"));
        return toRoomResponse(room, userUuid);
    }

    @Transactional
    public OrbitRoomResponse updateMemberSeats(
            String currentUserEmail,
            UUID roomUuid,
            UpdateOrbitMemberSeatsRequest request) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = loadEditableRoom(roomUuid, now);

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Ban chua tham gia phong Orbit nay"));

        List<UUID> seatUuids = OrbitSeatJson.normalizeSeatUuids(request.getSeatUuids());
        int maxSeatsPerBooking = systemConfigService.getMaxSeatsPerBooking();
        if (seatUuids.size() > maxSeatsPerBooking) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Moi thanh vien toi da " + maxSeatsPerBooking + " ghe");
        }

        assertNoCrossMemberSeatConflict(roomUuid, userUuid, seatUuids);
        showtimeSeatService.syncSeatLocks(
                currentUserEmail,
                new SyncSeatLockRequest(room.getShowtimeUuid(), seatUuids));

        member.setSeatUuidsJson(OrbitSeatJson.writeSeatUuids(seatUuids));
        member.setUpdatedAt(now);
        orbitMemberRepository.save(member);
        touchRoom(room, now);
        orbitRoomBroadcaster.notifyRoomUpdated(roomUuid);
        return toRoomResponse(room, userUuid);
    }

    @Transactional
    public OrbitCheckoutPrepareResponse prepareCheckout(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = loadEditableRoom(roomUuid, now);

        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chi host moi co the xac nhan nhom");
        }

        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid);
        if (members.size() < 2) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit can it nhat 2 thanh vien");
        }

        List<UUID> allSeats = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        for (OrbitMember member : members) {
            List<UUID> memberSeats = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            if (memberSeats.isEmpty()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Moi thanh vien phai chon it nhat 1 ghe");
            }
            for (UUID seatUuid : memberSeats) {
                if (!seen.add(seatUuid)) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Co ghe bi trung giua cac thanh vien");
                }
                allSeats.add(seatUuid);
            }
        }

        int maxSeatsPerBooking = systemConfigService.getMaxSeatsPerBooking();
        if (allSeats.size() > maxSeatsPerBooking) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Tong so ghe vuot qua gioi han " + maxSeatsPerBooking);
        }

        validateMemberSeatLocks(room.getShowtimeUuid(), members, now);
        int transferred = bookingNativeRepository.transferSeatLocksToUser(
                room.getShowtimeUuid(), hostUuid, allSeats, now);
        if (transferred != allSeats.size()) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe chua duoc giu hoac da het han");
        }

        room.setStatus(OrbitRoomStatus.CHECKOUT);
        room.setExpiresAt(now.plusMinutes(checkoutTtlMinutes));
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        orbitRoomBroadcaster.notifyRoomUpdated(roomUuid);

        OrbitCheckoutPrepareResponse response = new OrbitCheckoutPrepareResponse();
        response.setOrbitRoomUuid(roomUuid);
        response.setShowtimeUuid(room.getShowtimeUuid());
        response.setSeatUuids(allSeats);
        response.setMembers(toMemberResponses(members, room.getHostUserUuid()));
        return response;
    }

    @Transactional(readOnly = true)
    public void assertCheckoutReady(
            UUID orbitRoomUuid,
            UUID hostUserUuid,
            UUID showtimeUuid,
            List<UUID> seatUuids) {
        OrbitRoom room = orbitRoomRepository.findById(orbitRoomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit khong hop le"));

        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit chua san sang thanh toan");
        }
        if (!room.getHostUserUuid().equals(hostUserUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chi host moi thanh toan phong Orbit");
        }
        if (!room.getShowtimeUuid().equals(showtimeUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu khong khop voi phong Orbit");
        }

        List<UUID> expected = collectRoomSeatUuids(orbitRoomUuid);
        Set<UUID> requested = new LinkedHashSet<>(OrbitSeatJson.normalizeSeatUuids(seatUuids));
        if (!requested.equals(new LinkedHashSet<>(expected))) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sach ghe khong khop voi phong Orbit");
        }
    }

    @Transactional
    public OrbitBookingCompletionResult completeAfterBooking(
            UUID orbitRoomUuid,
            UUID bookingUuid,
            UUID movieUuid,
            UUID hostUserUuid,
            List<LockedSeat> lockedSeats,
            OffsetDateTime now) {
        OrbitRoom room = orbitRoomRepository.findById(orbitRoomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit khong hop le"));

        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit khong o trang thai thanh toan");
        }
        if (room.getBookingUuid() != null) {
            throw new AppException(ErrorCode.CONFLICT, "Phong Orbit da duoc thanh toan");
        }
        if (!room.getHostUserUuid().equals(hostUserUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chi host moi hoan tat phong Orbit");
        }

        Map<UUID, BigDecimal> seatPrices = new HashMap<>();
        for (LockedSeat seat : lockedSeats) {
            seatPrices.put(seat.seatUuid(), seat.price());
        }

        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(orbitRoomUuid);
        List<MissionCompletionResponse> missionCompletions = new ArrayList<>();
        int hostScoreAdded = 0;

        for (OrbitMember member : members) {
            UUID memberUuid = member.getUserUuid();
            BigDecimal memberSeatTotal = sumMemberSeatPrices(member, seatPrices);
            int memberScore = calculateScore(memberSeatTotal);
            if (memberScore > 0) {
                bookingNativeRepository.addUserScore(memberUuid, memberScore);
                bookingNativeRepository.addLifetimeScore(memberUuid, memberScore);
                bookingNativeRepository.insertScoreHistory(memberUuid, memberScore, bookingUuid, now);
            }
            if (memberUuid.equals(hostUserUuid)) {
                hostScoreAdded = memberScore;
            }
            if (movieUuid != null) {
                missionCompletions.addAll(missionService.handleEvent(
                        MissionEventPayload.theaterBooking(memberUuid, bookingUuid, movieUuid, now)));
            }
        }

        room.setStatus(OrbitRoomStatus.CLOSED);
        room.setBookingUuid(bookingUuid);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        orbitRoomBroadcaster.notifyRoomUpdated(orbitRoomUuid);

        return new OrbitBookingCompletionResult(hostScoreAdded, missionCompletions);
    }

    /**
     * Reverses per-member score and mission progress for a cancelled Orbit group booking.
     */
    @Transactional
    public void rollbackOrbitBookingRewards(
            UUID orbitRoomUuid,
            UUID bookingUuid,
            Map<UUID, BigDecimal> seatPriceByUuid,
            OffsetDateTime now) {
        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(orbitRoomUuid);
        for (OrbitMember member : members) {
            UUID memberUuid = member.getUserUuid();
            BigDecimal memberTotal = BigDecimal.ZERO;
            for (UUID seatUuid : OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson())) {
                BigDecimal price = seatPriceByUuid.get(seatUuid);
                if (price != null) {
                    memberTotal = memberTotal.add(price);
                }
            }
            int scoreDeducted = calculateScore(memberTotal);
            if (scoreDeducted > 0) {
                bookingNativeRepository.addUserScore(memberUuid, -scoreDeducted);
                bookingNativeRepository.insertRefundScoreHistory(memberUuid, scoreDeducted, bookingUuid, now);
            }
            try {
                missionService.rollbackBookingProgress(memberUuid, bookingUuid, now);
            } catch (Exception ignored) {
                // Non-blocking, same as solo cancel flow
            }
        }
    }

    @Transactional
    public void cancelRoom(String currentUserEmail, UUID roomUuid) {
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khong tim thay phong Orbit"));

        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chi host moi co the huy phong");
        }
        if (room.getStatus() == OrbitRoomStatus.CLOSED || room.getStatus() == OrbitRoomStatus.CANCELLED) {
            return;
        }

        releaseAllMemberLocks(room, now);
        rollbackAllMemberProgress(roomUuid, now);
        room.setStatus(OrbitRoomStatus.CANCELLED);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        orbitRoomBroadcaster.notifyRoomUpdated(roomUuid);
    }

    @Scheduled(fixedDelayString = "${app.orbit.expire-check-ms:60000}")
    @Transactional
    public void expireStaleRooms() {
        OffsetDateTime now = OffsetDateTime.now();
        List<OrbitRoom> expired = orbitRoomRepository.findExpiredOpenRooms(now);
        for (OrbitRoom room : expired) {
            if (room.getStatus() != OrbitRoomStatus.OPEN && room.getStatus() != OrbitRoomStatus.CHECKOUT) {
                continue;
            }
            releaseAllMemberLocks(room, now);
            rollbackAllMemberProgress(room.getUuid(), now);
            room.setStatus(OrbitRoomStatus.EXPIRED);
            room.setUpdatedAt(now);
            orbitRoomRepository.save(room);
            orbitRoomBroadcaster.notifyRoomUpdated(room.getUuid());
        }
    }

    private void assertOrbitEnabled() {
        if (!orbitEnabled) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Tinh nang Orbit Seat chua duoc bat");
        }
    }

    private UUID resolveRequiredUserUuid(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    private Showtime loadOpenShowtime(UUID showtimeUuid, OffsetDateTime now) {
        Showtime showtime = showtimeRepository.findById(showtimeUuid)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
        if (showtime.getStatus() != ShowtimeStatus.OPEN_FOR_BOOKING) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu khong mo ban ve");
        }
        if (showtime.getStartTime() != null && showtime.getStartTime().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu da bat dau");
        }
        return showtime;
    }

    private OrbitRoom loadJoinableRoom(UUID roomUuid, OffsetDateTime now) {
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khong tim thay phong Orbit"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit khong con mo de tham gia");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit da het han");
        }
        return room;
    }

    private OrbitRoom loadEditableRoom(UUID roomUuid, OffsetDateTime now) {
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khong tim thay phong Orbit"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit khong con cho phep chinh sua ghe");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong Orbit da het han");
        }
        return room;
    }

    private int clampMaxMembers(int requested) {
        int maxSeats = systemConfigService.getMaxSeatsPerBooking();
        int clamped = Math.max(2, Math.min(requested, maxSeats));
        return Math.min(clamped, 8);
    }

    private OrbitMember buildMember(UUID roomUuid, User user, OffsetDateTime now) {
        OrbitMember member = new OrbitMember();
        member.setUuid(UUID.randomUUID());
        member.setRoomUuid(roomUuid);
        member.setUserUuid(user.getId());
        member.setDisplayName(resolveDisplayName(user));
        member.setSeatUuidsJson("[]");
        member.setJoinedAt(now);
        member.setUpdatedAt(now);
        return member;
    }

    private String resolveDisplayName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        if (user.getEmail() != null && user.getEmail().contains("@")) {
            return user.getEmail().substring(0, user.getEmail().indexOf('@'));
        }
        return "Thành viên";
    }

    private void touchRoom(OrbitRoom room, OffsetDateTime now) {
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
    }

    private void assertNoCrossMemberSeatConflict(UUID roomUuid, UUID userUuid, List<UUID> seatUuids) {
        if (seatUuids.isEmpty()) {
            return;
        }
        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid);
        Set<UUID> taken = new HashSet<>();
        for (OrbitMember other : members) {
            if (other.getUserUuid().equals(userUuid)) {
                continue;
            }
            taken.addAll(OrbitSeatJson.readSeatUuids(other.getSeatUuidsJson()));
        }
        for (UUID seatUuid : seatUuids) {
            if (taken.contains(seatUuid)) {
                throw new AppException(ErrorCode.CONFLICT, "Ghe da duoc thanh vien khac chon");
            }
        }
    }

    private void validateMemberSeatLocks(UUID showtimeUuid, List<OrbitMember> members, OffsetDateTime now) {
        for (OrbitMember member : members) {
            List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            List<LockedSeat> locked = bookingNativeRepository.lockActiveSeatsForConfirm(
                    showtimeUuid, member.getUserUuid(), seatUuids, now);
            if (locked.size() != seatUuids.size()) {
                throw new AppException(ErrorCode.CONFLICT, "Co ghe chua duoc thanh vien giu hop le");
            }
        }
    }

    private List<UUID> collectRoomSeatUuids(UUID roomUuid) {
        List<UUID> all = new ArrayList<>();
        for (OrbitMember member : orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)) {
            all.addAll(OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson()));
        }
        return all;
    }

    private void releaseAllMemberLocks(OrbitRoom room, OffsetDateTime now) {
        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(room.getUuid());
        for (OrbitMember member : members) {
            List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            if (!seatUuids.isEmpty()) {
                bookingNativeRepository.deleteSeatLocks(room.getShowtimeUuid(), member.getUserUuid(), seatUuids);
            }
        }
        bookingNativeRepository.cleanupExpiredLocks(room.getShowtimeUuid(), now);
    }

    private void rollbackAllMemberProgress(UUID roomUuid, OffsetDateTime now) {
        for (OrbitMember member : orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)) {
            missionService.rollbackSourceProgress(member.getUserUuid(), roomUuid.toString(), now);
        }
    }

    private BigDecimal sumMemberSeatPrices(OrbitMember member, Map<UUID, BigDecimal> seatPrices) {
        BigDecimal total = BigDecimal.ZERO;
        for (UUID seatUuid : OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson())) {
            BigDecimal price = seatPrices.get(seatUuid);
            if (price != null) {
                total = total.add(price);
            }
        }
        return total;
    }

    private int calculateScore(BigDecimal totalPrice) {
        if (totalPrice == null || totalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        return totalPrice.divide(BigDecimal.valueOf(10000), 0, RoundingMode.DOWN).intValue();
    }

    private OrbitRoomResponse toRoomResponse(OrbitRoom room, UUID viewerUuid) {
        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(room.getUuid());
        OrbitRoomResponse response = new OrbitRoomResponse();
        response.setUuid(room.getUuid());
        response.setShowtimeUuid(room.getShowtimeUuid());
        response.setHostUserUuid(room.getHostUserUuid());
        response.setMaxMembers(room.getMaxMembers());
        response.setStatus(room.getStatus().name());
        response.setExpiresAt(room.getExpiresAt());
        response.setBookingUuid(room.getBookingUuid());
        response.setHost(room.getHostUserUuid().equals(viewerUuid));
        response.setSharePath("/booking/orbit/" + room.getUuid());
        response.setMembers(toMemberResponses(members, room.getHostUserUuid()));
        return response;
    }

    private List<OrbitMemberResponse> toMemberResponses(List<OrbitMember> members, UUID hostUserUuid) {
        List<OrbitMemberResponse> responses = new ArrayList<>();
        for (OrbitMember member : members) {
            OrbitMemberResponse item = new OrbitMemberResponse();
            item.setUserUuid(member.getUserUuid());
            item.setDisplayName(member.getDisplayName());
            item.setHost(hostUserUuid.equals(member.getUserUuid()));
            item.setSeatUuids(OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson()));
            item.setJoinedAt(member.getJoinedAt());
            responses.add(item);
        }
        return responses;
    }
}
