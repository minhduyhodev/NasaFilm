package com.thdpv.movietheater.orbit.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.entity.OrbitMember;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.orbit.util.OrbitSeatJson;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrbitRoomExpiryService {

    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitMemberRepository orbitMemberRepository;
    private final BookingNativeRepository bookingNativeRepository;
    private final MissionService missionService;
    private final OrbitRoomBroadcaster orbitRoomBroadcaster;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireRoom(UUID roomUuid) {
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findById(roomUuid).orElse(null);
        if (room == null) {
            return;
        }
        if (room.getStatus() != OrbitRoomStatus.OPEN && room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            return;
        }
        if (room.getExpiresAt().isAfter(now)) {
            return;
        }

        releaseAllMemberLocks(room, now);
        rollbackAllMemberProgress(room.getUuid(), now);
        room.setStatus(OrbitRoomStatus.EXPIRED);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        orbitRoomBroadcaster.notifyRoomUpdated(toBroadcastResponse(room));
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

    private OrbitRoomResponse toBroadcastResponse(OrbitRoom room) {
        OrbitRoomResponse response = new OrbitRoomResponse();
        response.setUuid(room.getUuid());
        response.setShowtimeUuid(room.getShowtimeUuid());
        response.setHostUserUuid(room.getHostUserUuid());
        response.setMaxMembers(room.getMaxMembers());
        response.setStatus(room.getStatus().name());
        response.setExpiresAt(room.getExpiresAt());
        response.setBookingUuid(room.getBookingUuid());
        response.setSharePath("/booking/orbit/" + room.getUuid());
        response.setMemberCount((int) orbitMemberRepository.countByRoomUuid(room.getUuid()));
        return response;
    }
}
