package com.thdpv.movietheater.orbit.event;

import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;

public record OrbitRoomUpdatedEvent(OrbitRoomResponse room) {
}
