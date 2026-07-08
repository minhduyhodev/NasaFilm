package com.thdpv.movietheater.support.service;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class SupportAgentPresenceService {

    private final ConcurrentHashMap<String, AgentPresence> onlineAgents = new ConcurrentHashMap<>();

    public void markOnline(String email, String displayName) {
        if (email == null || email.isBlank()) return;
        String key = email.trim().toLowerCase();
        onlineAgents.put(key, new AgentPresence(key, displayName, OffsetDateTime.now()));
    }

    public void markOffline(String email) {
        if (email == null || email.isBlank()) return;
        onlineAgents.remove(email.trim().toLowerCase());
    }

    public boolean isOnline(String email) {
        if (email == null || email.isBlank()) return false;
        return onlineAgents.containsKey(email.trim().toLowerCase());
    }

    public boolean hasOnlineAgents() {
        return !onlineAgents.isEmpty();
    }

    public Collection<AgentPresence> getOnlineAgents() {
        return onlineAgents.values();
    }

    public record AgentPresence(String email, String displayName, OffsetDateTime connectedAt) {}
}
