package com.thdpv.movietheater.orbit.service;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class OrbitTopicAccessService {

    private static final String TOPIC_PREFIX = "/topic/orbit/";

    private final OrbitRoomRepository orbitRoomRepository;
    private final OrbitMemberRepository orbitMemberRepository;
    private final UserRepository userRepository;

    @Value("${app.orbit.enabled:true}")
    private boolean orbitEnabled;

    public OrbitTopicAccessService(
            OrbitRoomRepository orbitRoomRepository,
            OrbitMemberRepository orbitMemberRepository,
            UserRepository userRepository) {
        this.orbitRoomRepository = orbitRoomRepository;
        this.orbitMemberRepository = orbitMemberRepository;
        this.userRepository = userRepository;
    }

    public boolean isOrbitTopic(String destination) {
        return destination != null && destination.startsWith(TOPIC_PREFIX);
    }

    public UUID parseRoomUuid(String destination) {
        if (!isOrbitTopic(destination)) {
            return null;
        }
        String suffix = destination.substring(TOPIC_PREFIX.length());
        if (suffix.isBlank()) {
            return null;
        }
        if (suffix.endsWith("/chat")) {
            suffix = suffix.substring(0, suffix.length() - "/chat".length());
        } else if (suffix.endsWith("/typing")) {
            suffix = suffix.substring(0, suffix.length() - "/typing".length());
        }
        try {
            return UUID.fromString(suffix);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public boolean canSubscribe(String userEmail, UUID roomUuid) {
        if (!orbitEnabled || userEmail == null || userEmail.isBlank() || roomUuid == null) {
            return false;
        }
        return userRepository.findByEmailIgnoreCase(userEmail.trim())
                .flatMap(user -> orbitRoomRepository.findById(roomUuid)
                        .flatMap(room -> orbitMemberRepository
                                .findByRoomUuidAndUserUuid(roomUuid, user.getId())
                                .map(member -> true)))
                .orElse(false);
    }
}
