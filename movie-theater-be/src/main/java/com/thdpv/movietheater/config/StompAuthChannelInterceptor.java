package com.thdpv.movietheater.config;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.thdpv.movietheater.orbit.service.OrbitTopicAccessService;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.support.service.SupportTopicAccessService;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);

    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;
    private final OrbitTopicAccessService orbitTopicAccessService;
    private final StompTopicAuthorizationService stompTopicAuthorizationService;
    private final SupportTopicAccessService supportTopicAccessService;

    public StompAuthChannelInterceptor(
            JwtUtils jwtUtils,
            UserDetailsService userDetailsService,
            OrbitTopicAccessService orbitTopicAccessService,
            StompTopicAuthorizationService stompTopicAuthorizationService,
            SupportTopicAccessService supportTopicAccessService) {
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
        this.orbitTopicAccessService = orbitTopicAccessService;
        this.stompTopicAuthorizationService = stompTopicAuthorizationService;
        this.supportTopicAccessService = supportTopicAccessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            authenticateConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscribe(accessor);
        }

        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        String token = resolveToken(accessor);
        if (!StringUtils.hasText(token) || !jwtUtils.validateToken(token)) {
            return;
        }

        try {
            String username = jwtUtils.getUsernameFromToken(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            accessor.setUser(authentication);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception ex) {
            log.debug("STOMP CONNECT authentication failed: {}", ex.getMessage());
        }
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        UsernamePasswordAuthenticationToken authentication = resolveAuthentication(accessor);

        if (orbitTopicAccessService.isOrbitTopic(destination)) {
            authorizeOrbitTopic(authentication, destination);
            return;
        }
        if (stompTopicAuthorizationService.isAdminTopic(destination)) {
            stompTopicAuthorizationService.assertAdminTopicAccess(authentication);
            return;
        }
        if (stompTopicAuthorizationService.isStaffTopic(destination)) {
            stompTopicAuthorizationService.assertStaffTopicAccess(authentication);
            return;
        }
        if (supportTopicAccessService.isSupportUserTopic(destination)) {
            authorizeSupportTopic(authentication, destination);
        }
    }

    private void authorizeSupportTopic(UsernamePasswordAuthenticationToken authentication, String destination) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Yêu cầu đăng nhập để theo dõi ticket hỗ trợ");
        }
        String ticketCode = supportTopicAccessService.parseTicketCode(destination);
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new AccessDeniedException("Topic hỗ trợ không hợp lệ");
        }
        if (stompTopicAuthorizationService.hasAdminRole(authentication)) {
            return;
        }
        if (!supportTopicAccessService.canSubscribe(authentication.getName(), ticketCode)) {
            throw new AccessDeniedException("Không có quyền theo dõi ticket hỗ trợ này");
        }
    }

    private void authorizeOrbitTopic(UsernamePasswordAuthenticationToken authentication, String destination) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Yêu cầu đăng nhập để theo dõi phòng Orbit");
        }

        UUID roomUuid = orbitTopicAccessService.parseRoomUuid(destination);
        if (roomUuid == null) {
            throw new AccessDeniedException("Topic Orbit không hợp lệ");
        }

        String email = authentication.getName();
        if (!orbitTopicAccessService.canSubscribe(email, roomUuid)) {
            throw new AccessDeniedException("Không có quyền theo dõi phòng Orbit này");
        }
    }

    private UsernamePasswordAuthenticationToken resolveAuthentication(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) {
            return auth;
        }
        String token = resolveToken(accessor);
        if (!StringUtils.hasText(token) || !jwtUtils.validateToken(token)) {
            return null;
        }
        try {
            String username = jwtUtils.getUsernameFromToken(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolveToken(StompHeaderAccessor accessor) {
        String bearer = firstNativeHeader(accessor, "Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7).trim();
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            Object sessionToken = sessionAttributes.get(WebSocketHandshakeAuthInterceptor.SESSION_JWT_KEY);
            if (sessionToken instanceof String token && StringUtils.hasText(token)) {
                return token.trim();
            }
        }

        return null;
    }

    private String firstNativeHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.get(0);
    }
}
