package com.thdpv.movietheater.support.service;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.thdpv.movietheater.config.StompTopicAuthorizationService;

@Component
public class SupportAgentPresenceSocketListener {

    private final SupportAgentPresenceService supportAgentPresenceService;
    private final SupportLiveSupportService supportLiveSupportService;
    private final StompTopicAuthorizationService stompTopicAuthorizationService;

    public SupportAgentPresenceSocketListener(
            SupportAgentPresenceService supportAgentPresenceService,
            SupportLiveSupportService supportLiveSupportService,
            StompTopicAuthorizationService stompTopicAuthorizationService) {
        this.supportAgentPresenceService = supportAgentPresenceService;
        this.supportLiveSupportService = supportLiveSupportService;
        this.stompTopicAuthorizationService = stompTopicAuthorizationService;
    }

    @EventListener
    public void onConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Authentication auth = (Authentication) accessor.getUser();
        if (stompTopicAuthorizationService.hasStaffOrAdminRole(auth)) {
            supportAgentPresenceService.markOnline(auth.getName(), auth.getName());
            supportLiveSupportService.publishPresenceChanged("AGENT_ONLINE", auth.getName(), auth.getName());
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        if (accessor.getUser() instanceof Authentication auth) {
            supportAgentPresenceService.markOffline(auth.getName());
            supportLiveSupportService.publishPresenceChanged("AGENT_OFFLINE", auth.getName(), auth.getName());
        }
    }
}
