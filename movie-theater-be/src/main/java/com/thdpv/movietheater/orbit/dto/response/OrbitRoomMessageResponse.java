package com.thdpv.movietheater.orbit.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrbitRoomMessageResponse {
    private UUID uuid;
    private UUID roomUuid;
    private UUID senderUserUuid;
    private String senderDisplayName;
    private String message;
    private boolean system;
    private OffsetDateTime createdAt;
}
