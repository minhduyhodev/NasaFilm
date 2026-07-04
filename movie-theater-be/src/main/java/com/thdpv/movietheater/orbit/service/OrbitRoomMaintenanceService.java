package com.thdpv.movietheater.orbit.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.orbit.entity.OrbitRoom;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrbitRoomMaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(OrbitRoomMaintenanceService.class);

    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitRoomExpiryService orbitRoomExpiryService;

    @Scheduled(fixedDelayString = "${app.orbit.expire-check-ms:60000}")
    public void expireStaleRooms() {
        OffsetDateTime now = OffsetDateTime.now();
        List<OrbitRoom> expired = orbitRoomRepository.findExpiredOpenRooms(now);
        for (OrbitRoom room : expired) {
            try {
                orbitRoomExpiryService.expireRoom(room.getUuid());
            } catch (Exception ex) {
                log.warn("Failed to expire orbit room {}: {}", room.getUuid(), ex.getMessage());
            }
        }
    }
}
