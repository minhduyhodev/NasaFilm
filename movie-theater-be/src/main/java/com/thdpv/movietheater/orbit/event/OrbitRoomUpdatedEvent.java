package com.thdpv.movietheater.orbit.event;

import java.util.UUID;

public record OrbitRoomUpdatedEvent(UUID roomUuid, String eventType) {
}
