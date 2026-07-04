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
import com.thdpv.movietheater.orbit.util.OrbitSeatJson;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrbitRoomService {

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

        List<OrbitRoom> activeHostRooms = orbitRoomRepository.findByHostUserUuidAndStatusIn(
                hostUuid, List.of(OrbitRoomStatus.OPEN, OrbitRoomStatus.CHECKOUT));
        if (!activeHostRooms.isEmpty()) {
            throw new AppException(
                    ErrorCode.CONFLICT,
                    "Bạn đã có phòng Orbit đang hoạt động. Hãy hoàn tất hoặc hủy phòng hiện tại.");
        }

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
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));
            return toRoomResponse(room, userUuid);
        }

        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không còn mở để tham gia");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit đã hết hạn");
        }

        long memberCount = orbitMemberRepository.countByRoomUuid(roomUuid);
        if (memberCount >= room.getMaxMembers()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit đã đủ thành viên");
        }

        User user = userRepository.findById(userUuid).orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        OrbitMember member = buildMember(roomUuid, user, now);
        orbitMemberRepository.save(member);

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
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));

        if (room.getHostUserUuid().equals(userUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Host không thể rời phòng. Hãy hủy phòng nếu cần.");
        }
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không còn ở trạng thái cho phép rời");
        }

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Bạn không ở trong phòng này"));

        List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
        if (!seatUuids.isEmpty()) {
            bookingNativeRepository.deleteSeatLocks(room.getShowtimeUuid(), userUuid, seatUuids);
            seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        }

        missionService.rollbackSourceProgress(userUuid, roomUuid.toString(), now);
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
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));

        boolean isMember = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid).isPresent();
        if (!isMember && room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng Orbit này");
        }
        if (isMember && room.getStatus() == OrbitRoomStatus.OPEN) {
            reconcileMemberSeats(room, now);
        }
        if (!isMember) {
            return toPreviewResponse(room);
        }
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
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));

        OrbitMember member = orbitMemberRepository.findByRoomUuidAndUserUuid(roomUuid, userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.FORBIDDEN, "Bạn chưa tham gia phòng Orbit này"));

        List<UUID> seatUuids = OrbitSeatJson.normalizeSeatUuids(request.getSeatUuids());
        int maxSeatsPerBooking = systemConfigService.getMaxSeatsPerBooking();
        assertOrbitRoomSeatTotalWithinLimit(roomUuid, userUuid, seatUuids, maxSeatsPerBooking);

        assertNoCrossMemberSeatConflict(roomUuid, userUuid, seatUuids);
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không còn cho phép chỉnh sửa ghế");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit đã hết hạn");
        }
        showtimeSeatService.syncSeatLocks(
                currentUserEmail,
                new SyncSeatLockRequest(room.getShowtimeUuid(), seatUuids));

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
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không còn cho phép chỉnh sửa ghế");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit đã hết hạn");
        }
        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới có thể xác nhận nhóm");
        }

        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid);
        if (members.size() < 2) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit cần ít nhất 2 thành viên");
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
        for (OrbitMember member : members) {
            List<UUID> memberSeats = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            int transferred = bookingNativeRepository.transferSeatLocksFromUserToUser(
                    room.getShowtimeUuid(), member.getUserUuid(), hostUuid, memberSeats, now);
            if (transferred != memberSeats.size()) {
                throw new AppException(ErrorCode.CONFLICT, "Có ghế chưa được giữ hoặc đã hết hạn");
            }
        }

        room.setStatus(OrbitRoomStatus.CHECKOUT);
        room.setExpiresAt(now.plusMinutes(checkoutTtlMinutes));
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        seatMapEventPublisher.notifySeatMapUpdated(room.getShowtimeUuid());
        broadcastRoom(toRoomResponse(room, hostUuid));

        OrbitCheckoutPrepareResponse response = new OrbitCheckoutPrepareResponse();
        response.setOrbitRoomUuid(roomUuid);
        response.setShowtimeUuid(room.getShowtimeUuid());
        response.setSeatUuids(allSeats);
        response.setMembers(toMemberResponses(members, room.getHostUserUuid()));
        return response;
    }

    @Transactional
    public OrbitRoomResponse abortCheckout(String currentUserEmail, UUID roomUuid) {
        assertOrbitEnabled();
        UUID hostUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));

        if (!room.getHostUserUuid().equals(hostUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới có thể hủy checkout");
        }
        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không ở trạng thái checkout");
        }

        List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid);
        for (OrbitMember member : members) {
            List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
            if (seatUuids.isEmpty()) {
                continue;
            }
            int transferred = bookingNativeRepository.transferSeatLocksFromUserToUser(
                    room.getShowtimeUuid(), hostUuid, member.getUserUuid(), seatUuids, now);
            if (transferred != seatUuids.size()) {
                throw new AppException(ErrorCode.CONFLICT, "Không thể trả lại khóa ghế cho thành viên");
            }
        }

        room.setStatus(OrbitRoomStatus.OPEN);
        room.setExpiresAt(now.plusMinutes(roomTtlMinutes));
        room.setUpdatedAt(now);
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
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không hợp lệ"));

        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit chưa sẵn sàng thanh toán");
        }
        if (room.getExpiresAt() != null && !room.getExpiresAt().isAfter(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit đã hết hạn thanh toán");
        }
        if (!room.getHostUserUuid().equals(hostUserUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới thanh toán phòng Orbit");
        }
        if (!room.getShowtimeUuid().equals(showtimeUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suất chiếu không khớp với phòng Orbit");
        }

        List<UUID> expected = collectRoomSeatUuids(orbitRoomUuid);
        Set<UUID> requested = new LinkedHashSet<>(OrbitSeatJson.normalizeSeatUuids(seatUuids));
        if (!requested.equals(new LinkedHashSet<>(expected))) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sách ghế không khớp với phòng Orbit");
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
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không hợp lệ"));

        if (room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không ở trạng thái thanh toán");
        }
        if (room.getBookingUuid() != null) {
            throw new AppException(ErrorCode.CONFLICT, "Phòng Orbit đã được thanh toán");
        }
        if (!room.getHostUserUuid().equals(hostUserUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Chỉ host mới hoàn tất phòng Orbit");
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
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));

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
            throw new AppException(ErrorCode.BAD_REQUEST, "Tính năng Orbit Seat chưa được bật");
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
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng Orbit"));
        if (room.getStatus() != OrbitRoomStatus.OPEN) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit không còn cho phép chỉnh sửa ghế");
        }
        if (room.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit đã hết hạn");
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
                    "Phòng Orbit tối đa " + maxSeatsPerBooking + " ghế cho cả nhóm");
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
            responses.add(item);
        }
        return responses;
    }
}
