package com.thdpv.movietheater.orbit.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrbitRoomExpiryService {

    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitMemberRepository orbitMemberRepository;
    private final OrbitRoomLockHelper orbitRoomLockHelper;
    private final OrbitRoomMissionHelper orbitRoomMissionHelper;
    private final OrbitRoomBroadcaster orbitRoomBroadcaster;
    private final OrbitRoomResponseMapper orbitRoomResponseMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireRoom(UUID roomUuid) {
        OffsetDateTime now = OffsetDateTime.now();
        OrbitRoom room = orbitRoomRepository.findByIdForUpdate(roomUuid).orElse(null);
        if (room == null) {
            return;
        }
        if (room.getStatus() != OrbitRoomStatus.OPEN && room.getStatus() != OrbitRoomStatus.CHECKOUT) {
            return;
        }
        if (room.getExpiresAt().isAfter(now)) {
            return;
        }

        orbitRoomLockHelper.releaseAllRoomLocks(room, now);
        orbitRoomMissionHelper.rollbackAllMemberProgress(room.getUuid(), now);
        room.setStatus(OrbitRoomStatus.EXPIRED);
        room.setUpdatedAt(now);
        orbitRoomRepository.save(room);
        orbitRoomBroadcaster.notifyRoomUpdated(toBroadcastResponse(room));
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
        orbitRoomResponseMapper.enrichShowtimeContext(response, room);
        return response;
    }
}
