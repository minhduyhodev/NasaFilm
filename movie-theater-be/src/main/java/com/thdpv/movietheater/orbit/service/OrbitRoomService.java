package com.thdpv.movietheater.orbit.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.SyncSeatLockRequest;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.LockedSeat;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.service.SeatGapValidationService;
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
import com.thdpv.movietheater.orbit.repository.OrbitRoomMessageRepository;
import com.thdpv.movietheater.orbit.entity.OrbitRoomMessage;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomMessageResponse;
import com.thdpv.movietheater.orbit.dto.OrbitComboItem;
import com.thdpv.movietheater.orbit.util.OrbitSeatJson;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrbitRoomService {

    private static final List<OrbitRoomStatus> ACTIVE_ROOM_STATUSES = List.of(
            OrbitRoomStatus.OPEN, OrbitRoomStatus.CHECKOUT);

    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitMemberRepository orbitMemberRepository;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatService showtimeSeatService;
    private final BookingNativeRepository bookingNativeRepository;
    private final SeatGapValidationService seatGapValidationService;
    private final MissionService missionService;
    private final SystemConfigService systemConfigService;
    private final OrbitRoomBroadcaster orbitRoomBroadcaster;
    private final SeatMapEventPublisher seatMapEventPublisher;
    private final OrbitRoomLockHelper orbitRoomLockHelper;
    private final OrbitRoomMissionHelper orbitRoomMissionHelper;
    private final OrbitRoomResponseMapper orbitRoomResponseMapper;
    private final OrbitRoomExpiryService orbitRoomExpiryService;
    private final OrbitRoomMessageRepository orbitRoomMessageRepository;


    @Value("${app.orbit.enabled:true}")
    private boolean orbitEnabled;

    @Value("${app.orbit.room.ttl-minutes:30}")
    private int roomTtlMinutesFallback;

    @Value("${app.orbit.checkout.ttl-minutes:15}")
    private int checkoutTtlMinutesFallback;

    private int resolveRoomTtlMinutes() {
        try {
            return systemConfigService.getOrbitRoomTtlMinutes();
        } catch (Exception ignored) {
            return roomTtlMinutesFallback;
        }
    }

    private int resolveCheckoutTtlMinutes() {
        try {
            return systemConfigService.getOrbitCheckoutTtlMinutes();
        } catch (Exception ignored) {
            return Math.max(checkoutTtlMinutesFallback, systemConfigService.getSeatLockMinutes());
        }
    }

    @Transactional
    public OrbitRoomResponse createRoom(String currentUserEmail, CreateOrbitRoomRequest request) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();

        expireStaleOrbitRoomsForHost(hostUuid, now);

        List<OrbitRoom> activeHostRooms = orbitRoomRepository.findByHostUserUuidAndStatusIn(
                hostUuid, ACTIVE_ROOM_STATUSES).stream()
                .filter(room -> room.getExpiresAt().isAfter(now))
                .toList();
        if (!activeHostRooms.isEmpty()) {
            throw new AppException(
                    ErrorCode.CONFLICT,
                    "Bạn đã có phòng nhóm đang hoạt động. Hãy hoàn tất hoặc hủy phòng hiện tại.");
        }

        Showtime showtime = loadOpenShowtime(request.getShowtimeUuid(), now);

        int maxMembers = clampMaxMembers(request.getMaxMembers());
        OffsetDateTime expiresAt = now.plusMinutes(resolveRoomTtlMinutes());

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
        saveAndBroadcastSystemMessage(room.getUuid(), hostMember.getDisplayName() + " đã tạo và tham gia phòng", now);

        missionService.handleOrbitRoomJoined(hostUuid, room.getUuid(), now);
        OrbitRoomResponse response = toRoomResponse(room, hostUuid);
        broadcastRoom(response);
        return response;
    }

    @Transactional
    public OrbitRoomResponse joinRoom(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();

        if (orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid).isPresent()) {
            OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));
            return toRoomResponse(room, userUuid);
        }

        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không còn mở để tham gia");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm đã hết hạn");
        }

        long memberCount = orbitMemberRepository.countByRoomUuid(roomUuid);
        if (memberCount >= room.getMaxMembers()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm đã đủ thành viên");
        }

        User user = userRepository.findById(userUuid).orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        OrbitMember member = buildMember(roomUuid, user, now);
        try {
            orbitMemberRepository.save(member);
        } catch (DataIntegrityViolationException ex) {
            OrbitRoom existingRoom = orbitRoomRepository.findById(roomUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));
            return toRoomResponse(existingRoom, userUuid);
        }

        saveAndBroadcastSystemMessage(roomUuid, member.getDisplayName() + " đã tham gia phòng", now);

        missionService.handleOrbitRoomJoined(userUuid, roomUuid, now);
        touchRoom(room, now);
        OrbitRoomResponse response = toRoomResponse(room, userUuid);
        broadcastRoom(response);
        return response;
    }

    @Transactional
    public OrbitRoomResponse leaveRoom(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));

        if (room.getHostUserUuid().equals(userUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Host không thể rời phòng. Hãy hủy phòng nếu cần.");
        }
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không còn ở trạng thái cho phép rời");
        }

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Bạn không ở trong phòng này"));

        List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
        if (!seatUuids.isEmpty()) {
            bookingNativeRepository.deleteSeatLocks(room.getShowtimeUuid(), userUuid, seatUuids);
            seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        }

        missionService.rollbackSourceProgress(userUuid, roomUuid.toString(), now);
        saveAndBroadcastSystemMessage(roomUuid, member.getDisplayName() + " đã rời phòng", now);
        orbitMemberRepository.delete(member);
        touchRoom(room, now);
        OrbitRoomResponse response = toRoomResponse(room, userUuid);
        broadcastRoom(response);
        return response;
    }

    @Transactional
    public OrbitRoomResponse getRoom(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));

        boolean isMember = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid).isPresent();
        if (!isMember && room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng nhóm này");
        }
        if (isMember && room.getStatus() == OrbitRoomStatus.OPEN) {
            reconcileMemberSeats(room, now);
        }
        if (!isMember) {
            return toPreviewResponse(room);
        }
        return toRoomResponse(room, userUuid);
    }

    @Transactional(readOnly = true)
    public List<OrbitRoomResponse> getActiveRoomsForUser(String currentUserEmail) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        return getActiveRoomsForUserInternal(userUuid, now);
    }

    private List<OrbitRoomResponse> getActiveRoomsForUserInternal(UUID userUuid, OffsetDateTime now) {
        expireStaleOrbitRoomsForHost(userUuid, now);

        Map<UUID, OrbitRoom> unique = new java.util.LinkedHashMap<>();

        orbitRoomRepository.findByHostUserUuidAndStatusIn(userUuid, ACTIVE_ROOM_STATUSES).stream()
                .filter(room -> room.getExpiresAt().isAfter(now))
                .forEach(room -> unique.putIfAbsent(room.getUuid(), room));

        orbitRoomRepository.findActiveRoomsForMember(userUuid, ACTIVE_ROOM_STATUSES, now)
                .forEach(room -> unique.putIfAbsent(room.getUuid(), room));

        return unique.values().stream()
                .map(room -> toRoomResponse(room, userUuid))
                .toList();
    }

    @Transactional
    public OrbitRoomResponse updateMemberSeats(
            String currentUserEmail,
            UUID roomUuid,
            UpdateOrbitMemberSeatsRequest request) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng nhóm này"));

        List<UUID> seatUuids = OrbitSeatJson.normalizeSeatUuids(request.getSeatUuids());
        int maxSeatsPerBooking = systemConfigService.getMaxSeatsPerBooking();
        assertOrbitRoomSeatTotalWithinLimit(roomUuid, userUuid, seatUuids, maxSeatsPerBooking);

        assertNoCrossMemberSeatConflict(roomUuid, userUuid, seatUuids);
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không còn cho phép chỉnh sửa ghế");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm đã hết hạn");
        }
        // Hold member seats for as long as the room lives (not the short solo TTL) so waiting members
        // don't silently lose their seats mid-session.
        Integer roomTtlSeconds = null;
        if (room.getExpiresAt() != null && room.getExpiresAt().isAfter(now)) {
            roomTtlSeconds = (int) Math.max(1, Duration.between(now, room.getExpiresAt()).getSeconds());
        }
        showtimeSeatService.syncSeatLocks(
                currentUserEmail,
                new SyncSeatLockRequest(room.getShowtimeUuid(), seatUuids),
                roomTtlSeconds);

        member.setSeatUuidsJson(OrbitSeatJson.writeSeatUuids(seatUuids));
        member.setUpdatedAt(now);
        orbitMemberRepository.save(member);
        touchRoom(room, now);
        OrbitRoomResponse response = toRoomResponse(room, userUuid);
        broadcastRoom(response);
        return response;
    }

    @Transactional
    public OrbitCheckoutPrepareResponse prepareCheckout(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không còn cho phép chỉnh sửa ghế");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm đã hết hạn");
        }
        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới có thể xác nhận nhóm");
        }

        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid);
        if (members.size() < 2) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm cần ít nhất 2 thành viên");
        }

        for (OrbitMember member : members) {
            if (!member.getUserUuid().equals(hostUuid) && !member.isCompleted()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Tất cả thành viên khác phải hoàn tất đặt vé và nước trước.");
            }
        }

        List<UUID> allSeats = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        for (OrbitMember member : members) {
            List<UUID> memberSeats = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            if (memberSeats.isEmpty()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mỗi thành viên phải chọn ít nhất 1 ghế");
            }
            for (UUID seatUuid : memberSeats) {
                if (!seen.add(seatUuid)) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Có ghế bị trùng giữa các thành viên");
                }
                allSeats.add(seatUuid);
            }
        }

        int maxSeatsPerBooking = systemConfigService.getMaxSeatsPerBooking();
        if (allSeats.size() > maxSeatsPerBooking) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Tổng số ghế vượt quá giới hạn " + maxSeatsPerBooking);
        }

        validateMemberSeatLocks(room.getShowtimeUuid(), members, now);
        seatGapValidationService.validateNoSingleSeatGap(room.getShowtimeUuid(), allSeats, now);
        OffsetDateTime checkoutExpiresAt = now.plusMinutes(resolveCheckoutTtlMinutes());
        for (OrbitMember member : members) {
            List<UUID> memberSeats = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            int transferred = bookingNativeRepository.transferSeatLocksFromUserToUser(
                    room.getShowtimeUuid(), member.getUserUuid(), hostUuid, memberSeats, now, checkoutExpiresAt);
            if (transferred != memberSeats.size()) {
                throw new AppException(ErrorCode.CONFLICT, "Có ghế chưa được giữ hoặc đã hết hạn");
            }
        }

        room.setStatus(OrbitRoomStatus.CHECKOUT);
        room.setExpiresAt(checkoutExpiresAt);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        broadcastRoom(toRoomResponse(room, hostUuid));

        OrbitCheckoutPrepareResponse response = new OrbitCheckoutPrepareResponse();
        response.setOrbitRoomUuid(roomUuid);
        response.setShowtimeUuid(room.getShowtimeUuid());
        response.setSeatUuids(allSeats);
        response.setMembers(toMemberResponses(members, room.getHostUserUuid()));
        response.setCheckoutExpiresAt(checkoutExpiresAt);
        return response;
    }

    @Transactional
    public OrbitRoomResponse abortCheckout(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));

        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới có thể hủy checkout");
        }
        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không ở trạng thái checkout");
        }

        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid);
        OffsetDateTime renewExpiresAt = now.plusMinutes(resolveRoomTtlMinutes());
        for (OrbitMember member : members) {
            member.setCompleted(false);
            List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            if (seatUuids.isEmpty()) {
                continue;
            }
            int transferred = bookingNativeRepository.transferSeatLocksFromUserToUser(
                    room.getShowtimeUuid(), hostUuid, member.getUserUuid(), seatUuids, now, renewExpiresAt);
            if (transferred != seatUuids.size()) {
                // Seat TTL may have already lapsed during checkout — force reassign + renew.
                transferred = bookingNativeRepository.forceTransferSeatLocksFromUserToUser(
                        room.getShowtimeUuid(), hostUuid, member.getUserUuid(), seatUuids, now, renewExpiresAt);
            }
            if (transferred != seatUuids.size()) {
                throw new AppException(ErrorCode.CONFLICT,
                        "Không thể trả lại khóa ghế. Vui lòng chọn lại ghế trong phòng Orbit.");
            }
        }

        room.setStatus(OrbitRoomStatus.OPEN);
        room.setExpiresAt(renewExpiresAt);
        room.setUpdatedAt(now);
        orbitMemberRepository.saveAll(members);
        orbitRoomRepository.save(room);
        seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        OrbitRoomResponse response = toRoomResponse(room, hostUuid);
        broadcastRoom(response);
        return response;
    }

    @Transactional
    public void assertCheckoutReady(
            UUID orbitRoomUuid,
            UUID hostUserUuid,
            UUID showtimeUuid,
            List<UUID> seatUuids) {
        assertOrbitEnabled();
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(orbitRoomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không hợp lệ"));

        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm chưa sẵn sàng thanh toán");
        }
        if (room.getExpiresAt() != null && !room.getExpiresAt().isAfter(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm đã hết hạn thanh toán");
        }
        if (!room.getHostUserUuid().equals(hostUserUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ chủ phòng mới thanh toán phòng nhóm");
        }
        if (!room.getShowtimeUuid().equals(showtimeUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suất chiếu không khớp với phòng nhóm");
        }

        List<UUID> expected = collectRoomSeatUuids(orbitRoomUuid);
        Set<UUID> requested = new LinkedHashSet<>(OrbitSeatJson.normalizeSeatUuids(seatUuids));
        if (!requested.equals(new LinkedHashSet<>(expected))) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sách ghế không khớp với phòng nhóm");
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
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(orbitRoomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không hợp lệ"));

        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không ở trạng thái thanh toán");
        }
        if (room.getBookingUuid() != null) {
            throw new AppException(ErrorCode.CONFLICT, "Phòng nhóm đã được thanh toán");
        }
        if (!room.getHostUserUuid().equals(hostUserUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ chủ phòng mới hoàn tất phòng nhóm");
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
        broadcastRoom(toRoomResponse(room, hostUserUuid));

        return new OrbitBookingCompletionResult(hostScoreAdded, missionCompletions);
    }

    @Transactional(readOnly = true)
    public List<OrbitMember> listMembers(UUID orbitRoomUuid) {
        return orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(orbitRoomUuid);
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
                bookingNativeRepository.addLifetimeScore(memberUuid, -scoreDeducted);
                bookingNativeRepository.insertRefundScoreHistory(memberUuid, scoreDeducted, bookingUuid, now);
            }
            try {
                missionService.rollbackBookingProgress(memberUuid, bookingUuid, now);
            } catch (Exception ignored) {
                // Non-blocking, same as solo cancel flow
            }
        }

        orbitRoomRepository.findByIdForUpdate(orbitRoomUuid).ifPresent(room -> {
            if (bookingUuid.equals(room.getBookingUuid())) {
                room.setBookingUuid(null);
                room.setStatus(OrbitRoomStatus.CANCELLED);
                room.setUpdatedAt(now);
                orbitRoomRepository.save(room);
                broadcastRoom(toRoomResponse(room, room.getHostUserUuid()));
            }
        });
    }

    @Transactional
    public OrbitRoomResponse cancelRoom(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));

        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới có thể hủy phòng");
        }
        if (room.getStatus() == OrbitRoomStatus.CLOSED || room.getStatus() == OrbitRoomStatus.CANCELLED) {
            return toRoomResponse(room, hostUuid);
        }

        orbitRoomLockHelper.releaseAllRoomLocks(room, now);
        orbitRoomMissionHelper.rollbackAllMemberProgress(roomUuid, now);
        room.setStatus(OrbitRoomStatus.CANCELLED);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        OrbitRoomResponse response = toRoomResponse(room, hostUuid);
        broadcastRoom(response);
        return response;
    }

    private void assertOrbitEnabled() {
        if (!orbitEnabled) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Tính năng đặt vé nhóm chưa được bật");
        }
    }

    public boolean isOrbitEnabled() {
        return orbitEnabled;
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
            throw new AppException(ErrorCode.BAD_REQUEST, "Suất chiếu không mở bán vé");
        }
        if (showtime.getStartTime() != null && showtime.getStartTime().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suất chiếu đã bắt đầu");
        }
        return showtime;
    }

    private void broadcastRoom(OrbitRoomResponse response) {
        orbitRoomBroadcaster.notifyRoomUpdated(response);
    }

    private void reconcileMemberSeats(OrbitRoom room, OffsetDateTime now) {
        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(room.getUuid());
        for (OrbitMember member : members) {
            List<UUID> jsonSeats = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            if (jsonSeats.isEmpty()) {
                continue;
            }
            Set<UUID> activeLocks = new HashSet<>(
                    bookingNativeRepository.findActiveLockedSeatUuids(
                            room.getShowtimeUuid(), member.getUserUuid(), now));
            List<UUID> reconciled = jsonSeats.stream().filter(activeLocks::contains).toList();
            if (reconciled.size() != jsonSeats.size()) {
                member.setSeatUuidsJson(OrbitSeatJson.writeSeatUuids(reconciled));
                member.setUpdatedAt(now);
                orbitMemberRepository.save(member);
            }
        }
    }

    private OrbitRoomResponse toPreviewResponse(OrbitRoom room) {
        OrbitRoomResponse response = new OrbitRoomResponse();
        response.setUuid(room.getUuid());
        response.setShowtimeUuid(room.getShowtimeUuid());
        response.setHostUserUuid(room.getHostUserUuid());
        response.setMaxMembers(room.getMaxMembers());
        response.setStatus(room.getStatus().name());
        response.setExpiresAt(room.getExpiresAt());
        response.setSharePath("/booking/orbit/" + room.getUuid());
        response.setHost(false);
        response.setViewerMember(false);
        response.setMemberCount((int) orbitMemberRepository.countByRoomUuid(room.getUuid()));
        response.setMembers(List.of());
        orbitRoomResponseMapper.enrichShowtimeContext(response, room);
        return response;
    }

    private OrbitRoom loadEditableRoom(UUID roomUuid, OffsetDateTime now) {
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng nhóm"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm không còn cho phép chỉnh sửa ghế");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng nhóm đã hết hạn");
        }
        return room;
    }

    private int clampMaxMembers(int requested) {
        int maxSeats = systemConfigService.getMaxSeatsPerBooking();
        return Math.max(2, Math.min(requested, maxSeats));
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

    private void assertOrbitRoomSeatTotalWithinLimit(
            UUID roomUuid,
            UUID userUuid,
            List<UUID> seatUuids,
            int maxSeatsPerBooking) {
        int otherMembersTotal = 0;
        for (OrbitMember other : orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)) {
            if (!other.getUserUuid().equals(userUuid)) {
                otherMembersTotal += OrbitSeatJson.readSeatUuids(other.getSeatUuidsJson()).size();
            }
        }
        int nextTotal = otherMembersTotal + seatUuids.size();
        if (nextTotal > maxSeatsPerBooking) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Phòng nhóm tối đa " + maxSeatsPerBooking + " ghế cho cả nhóm");
        }
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
                throw new AppException(ErrorCode.CONFLICT, "Ghế đã được thành viên khác chọn");
            }
        }
    }

    private void validateMemberSeatLocks(UUID showtimeUuid, List<OrbitMember> members, OffsetDateTime now) {
        for (OrbitMember member : members) {
            List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            List<LockedSeat> locked = bookingNativeRepository.lockActiveSeatsForConfirm(
                    showtimeUuid, member.getUserUuid(), seatUuids, now);
            if (locked.size() != seatUuids.size()) {
                throw new AppException(ErrorCode.CONFLICT, "Có ghế chưa được thành viên giữ hợp lệ");
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

    private static final ObjectMapper ORBIT_COMBO_MAPPER = new ObjectMapper();

    /**
     * Aggregates the concession combos chosen by every NON-host member of an Orbit room, keyed by
     * {@code comboUuid} and summed by quantity. This is the server's authoritative source for member
     * combos during checkout: the host's booking request carries only the host's own combos, so a stale
     * or tampered client can no longer silently drop members' concession orders from the charge or from
     * {@code booking_combo}. The host's combos are intentionally excluded here — they ride in the booking
     * request and are merged in {@code BookingService.confirmBooking}.
     */
    @Transactional(readOnly = true)
    public Map<UUID, Integer> collectNonHostMemberComboQuantities(UUID roomUuid) {
        OrbitRoom room = orbitRoomRepository.findById(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));
        UUID hostUuid = room.getHostUserUuid();
        Map<UUID, Integer> quantities = new LinkedHashMap<>();
        for (OrbitMember member : orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)) {
            if (member.getUserUuid() != null && member.getUserUuid().equals(hostUuid)) {
                continue;
            }
            for (OrbitComboItem item : parseComboItems(member.getCombosJson())) {
                if (item.getComboUuid() == null || item.getQuantity() <= 0) {
                    continue;
                }
                quantities.merge(item.getComboUuid(), item.getQuantity(), Integer::sum);
            }
        }
        return quantities;
    }

    private List<OrbitComboItem> parseComboItems(String combosJson) {
        if (combosJson == null || combosJson.isBlank()) {
            return List.of();
        }
        try {
            return ORBIT_COMBO_MAPPER.readValue(combosJson, new TypeReference<List<OrbitComboItem>>() {
            });
        } catch (Exception ex) {
            return List.of();
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

    private void expireStaleOrbitRoomsForHost(UUID hostUuid, OffsetDateTime now) {
        orbitRoomRepository.findByHostUserUuidAndStatusIn(hostUuid, ACTIVE_ROOM_STATUSES).stream()
                .filter(room -> !room.getExpiresAt().isAfter(now))
                .map(OrbitRoom::getUuid)
                .forEach(orbitRoomExpiryService::expireRoom);
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
        response.setViewerMember(true);
        response.setMemberCount(members.size());
        response.setSharePath("/booking/orbit/" + room.getUuid());
        response.setMembers(toMemberResponses(members, room.getHostUserUuid()));
        orbitRoomResponseMapper.enrichShowtimeContext(response, room);
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
            item.setCombosJson(member.getCombosJson());
            item.setCompleted(member.isCompleted());
            responses.add(item);
        }
        return responses;
    }

    @Transactional
    public OrbitRoomMessageResponse sendChatMessage(String currentUserEmail, UUID roomUuid, String messageText) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng Orbit này"));

        OrbitRoomMessage msg = new OrbitRoomMessage();
        msg.setUuid(UUID.randomUUID());
        msg.setRoomUuid(roomUuid);
        msg.setSenderUserUuid(userUuid);
        msg.setSenderDisplayName(member.getDisplayName());
        msg.setMessage(messageText.trim());
        msg.setSystem(false);
        msg.setCreatedAt(OffsetDateTime.now());

        OrbitRoomMessage saved = orbitRoomMessageRepository.save(msg);

        OrbitRoomMessageResponse response = OrbitRoomMessageResponse.builder()
                .uuid(saved.getUuid())
                .roomUuid(saved.getRoomUuid())
                .senderUserUuid(saved.getSenderUserUuid())
                .senderDisplayName(saved.getSenderDisplayName())
                .message(saved.getMessage())
                .system(saved.isSystem())
                .createdAt(saved.getCreatedAt())
                .build();

        orbitRoomBroadcaster.broadcastChatMessage(roomUuid, response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<OrbitRoomMessageResponse> getChatMessages(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng Orbit này"));

        return orbitRoomMessageRepository
                .findByRoomUuidAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(roomUuid, member.getJoinedAt())
                .stream()
                .map(msg -> OrbitRoomMessageResponse.builder()
                        .uuid(msg.getUuid())
                        .roomUuid(msg.getRoomUuid())
                        .senderUserUuid(msg.getSenderUserUuid())
                        .senderDisplayName(msg.getSenderDisplayName())
                        .message(msg.getMessage())
                        .system(msg.isSystem())
                        .createdAt(msg.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public OrbitRoomResponse updateMemberCombos(
            String currentUserEmail,
            UUID roomUuid,
            List<OrbitComboItem> combos,
            boolean completed) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));

        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không còn cho phép chỉnh sửa");
        }

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng Orbit này"));

        ObjectMapper mapper = new ObjectMapper();
        try {
            member.setCombosJson(mapper.writeValueAsString(combos != null ? combos : List.of()));
        } catch (Exception ex) {
            member.setCombosJson("[]");
        }
        member.setCompleted(completed);
        member.setUpdatedAt(now);
        orbitMemberRepository.save(member);

        touchRoom(room, now);
        OrbitRoomResponse response = toRoomResponse(room, userUuid);
        broadcastRoom(response);
        return response;
    }

    @Transactional(readOnly = true)
    public void broadcastTypingStatus(String currentUserEmail, UUID roomUuid, boolean isTyping) {
        assertOrbitEnabled();
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng Orbit này"));
        orbitRoomBroadcaster.broadcastTypingStatus(roomUuid, userUuid, member.getDisplayName(), isTyping);
    }

    private void saveAndBroadcastSystemMessage(UUID roomUuid, String messageText, OffsetDateTime now) {
        OrbitRoomMessage msg = new OrbitRoomMessage();
        msg.setUuid(UUID.randomUUID());
        msg.setRoomUuid(roomUuid);
        msg.setSenderDisplayName("Hệ thống");
        msg.setMessage(messageText);
        msg.setSystem(true);
        msg.setCreatedAt(now);
        orbitRoomMessageRepository.save(msg);

        OrbitRoomMessageResponse response = OrbitRoomMessageResponse.builder()
                .uuid(msg.getUuid())
                .roomUuid(msg.getRoomUuid())
                .senderDisplayName(msg.getSenderDisplayName())
                .message(msg.getMessage())
                .system(msg.isSystem())
                .createdAt(msg.getCreatedAt())
                .build();
        orbitRoomBroadcaster.broadcastChatMessage(roomUuid, response);
    }

    @Transactional(readOnly = true)
    public UUID resolveRoomCode(String code) {
        assertOrbitEnabled();
        String cleanCode = code.trim().toLowerCase();
        OffsetDateTime now = OffsetDateTime.now();
        List<OrbitRoom> activeRooms = orbitRoomRepository.findAllActiveRooms(now);
        for (OrbitRoom room : activeRooms) {
            String prefix = room.getUuid().toString().substring(0, 8).toLowerCase();
            if (prefix.equals(cleanCode)) {
                return room.getUuid();
            }
        }
        try {
            UUID uuid = UUID.fromString(cleanCode);
            if (orbitRoomRepository.existsById(uuid)) {
                return uuid;
            }
        } catch (IllegalArgumentException e) {
            // ignore
        }
        throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit với mã: " + code);
    }
}
