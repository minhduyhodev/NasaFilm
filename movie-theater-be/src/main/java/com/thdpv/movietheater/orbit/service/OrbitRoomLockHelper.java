package com.thdpv.movietheater.orbit.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.service.SeatMapEventPublisher;
import com.thdpv.movietheater.orbit.entity.OrbitMember;
import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.enums.OrbitRoomStatus;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.util.OrbitSeatJson;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OrbitRoomLockHelper {

    private final OrbitMemberRepository orbitMemberRepository;
    private final BookingNativeRepository bookingNativeRepository;
    private final SeatMapEventPublisher seatMapEventPublisher;

    public void releaseAllRoomLocks(OrbitRoom room, OffsetDateTime now) {
        UUID showtimeUuid = room.getShowtimeUuid();
        if (room.getStatus() == OrbitRoomStatus.CHECKOUT) {
            List<UUID> allSeats = collectAllSeatUuids(room.getUuid());
            if (!allSeats.isEmpty()) {
                bookingNativeRepository.deleteSeatLocks(showtimeUuid, room.getHostUserUuid(), allSeats);
            }
        } else {
            List<OrbitMember> members = orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(room.getUuid());
            for (OrbitMember member : members) {
                List<UUID> seatUuids = OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson());
                if (!seatUuids.isEmpty()) {
                    bookingNativeRepository.deleteSeatLocks(showtimeUuid, member.getUserUuid(), seatUuids);
                }
            }
        }
        bookingNativeRepository.cleanupExpiredLocks(showtimeUuid, now);
        seatMapEventPublisher.notifySeatMapUpdated(showtimeUuid);
    }

    private List<UUID> collectAllSeatUuids(UUID roomUuid) {
        List<UUID> all = new ArrayList<>();
        for (OrbitMember member : orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid)) {
            all.addAll(OrbitSeatJson.readSeatUuids(member.getSeatUuidsJson()));
        }
        return all;
    }
}
