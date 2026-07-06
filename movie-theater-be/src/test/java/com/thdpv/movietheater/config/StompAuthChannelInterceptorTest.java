package com.thdpv.movietheater.config;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import com.thdpv.movietheater.orbit.service.OrbitTopicAccessService;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.support.service.SupportTopicAccessService;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    @Mock
    private JwtUtils jwtUtils;
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private OrbitTopicAccessService orbitTopicAccessService;
    @Mock
    private StompTopicAuthorizationService stompTopicAuthorizationService;
    @Mock
    private SupportTopicAccessService supportTopicAccessService;

    @InjectMocks
    private StompAuthChannelInterceptor interceptor;

    private UUID roomUuid;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        roomUuid = UUID.randomUUID();
        userDetails = User.builder()
                .username("member@example.com")
                .password("n/a")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                .build();
    }

    @Test
    void connectWithValidTokenShouldAttachUser() {
        when(jwtUtils.validateToken("good-token")).thenReturn(true);
        when(jwtUtils.getUsernameFromToken("good-token")).thenReturn("member@example.com");
        when(userDetailsService.loadUserByUsername("member@example.com")).thenReturn(userDetails);

        Message<?> message = stompConnectMessage("Bearer good-token", null);
        Message<?> result = interceptor.preSend(message, mock(MessageChannel.class));

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertNotNull(accessor.getUser());
    }

    @Test
    void connectWithInvalidTokenShouldNotAttachUser() {
        when(jwtUtils.validateToken("bad-token")).thenReturn(false);

        Message<?> message = stompConnectMessage("Bearer bad-token", null);
        Message<?> result = interceptor.preSend(message, mock(MessageChannel.class));

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertNull(accessor.getUser());
    }

    @Test
    void subscribeOrbitShouldAllowMember() {
        String destination = "/topic/orbit/" + roomUuid;
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(true);
        when(orbitTopicAccessService.parseRoomUuid(destination)).thenReturn(roomUuid);
        when(orbitTopicAccessService.canSubscribe("member@example.com", roomUuid)).thenReturn(true);

        Message<?> message = stompSubscribeMessage(destination, authenticated("member@example.com"));
        assertNotNull(interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribeOrbitShouldDenyNonMember() {
        String destination = "/topic/orbit/" + roomUuid;
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(true);
        when(orbitTopicAccessService.parseRoomUuid(destination)).thenReturn(roomUuid);
        when(orbitTopicAccessService.canSubscribe("guest@example.com", roomUuid)).thenReturn(false);

        Message<?> message = stompSubscribeMessage(destination, authenticated("guest@example.com"));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribeOrbitShouldDenyUnauthenticated() {
        String destination = "/topic/orbit/" + roomUuid;
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(true);

        Message<?> message = stompSubscribeMessage(destination, null);
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribeSupportShouldAllowTicketOwner() {
        String destination = "/topic/support/TCK-001";
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isAdminTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isStaffTopic(destination)).thenReturn(false);
        when(supportTopicAccessService.isSupportUserTopic(destination)).thenReturn(true);
        when(supportTopicAccessService.parseTicketCode(destination)).thenReturn("TCK-001");
        when(stompTopicAuthorizationService.hasAdminRole(any())).thenReturn(false);
        when(supportTopicAccessService.canSubscribe("owner@example.com", "TCK-001")).thenReturn(true);

        Message<?> message = stompSubscribeMessage(destination, authenticated("owner@example.com"));
        assertNotNull(interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribeSupportShouldAllowAdmin() {
        String destination = "/topic/support/TCK-001";
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isAdminTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isStaffTopic(destination)).thenReturn(false);
        when(supportTopicAccessService.isSupportUserTopic(destination)).thenReturn(true);
        when(supportTopicAccessService.parseTicketCode(destination)).thenReturn("TCK-001");
        when(stompTopicAuthorizationService.hasAdminRole(any())).thenReturn(true);

        Message<?> message = stompSubscribeMessage(destination, authenticated("admin@example.com"));
        assertNotNull(interceptor.preSend(message, mock(MessageChannel.class)));
        verify(supportTopicAccessService, never()).canSubscribe(any(), any());
    }

    @Test
    void subscribeSupportShouldDenyNonOwner() {
        String destination = "/topic/support/TCK-001";
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isAdminTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isStaffTopic(destination)).thenReturn(false);
        when(supportTopicAccessService.isSupportUserTopic(destination)).thenReturn(true);
        when(supportTopicAccessService.parseTicketCode(destination)).thenReturn("TCK-001");
        when(stompTopicAuthorizationService.hasAdminRole(any())).thenReturn(false);
        when(supportTopicAccessService.canSubscribe("other@example.com", "TCK-001")).thenReturn(false);

        Message<?> message = stompSubscribeMessage(destination, authenticated("other@example.com"));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribeAdminTopicShouldDelegateToAuthorizationService() {
        String destination = "/topic/admin/alerts";
        when(orbitTopicAccessService.isOrbitTopic(destination)).thenReturn(false);
        when(stompTopicAuthorizationService.isAdminTopic(destination)).thenReturn(true);

        UsernamePasswordAuthenticationToken auth = authenticated("admin@example.com");
        Message<?> message = stompSubscribeMessage(destination, auth);
        interceptor.preSend(message, mock(MessageChannel.class));

        verify(stompTopicAuthorizationService).assertAdminTopicAccess(auth);
    }

    private Message<?> stompConnectMessage(String authorizationHeader, Map<String, Object> sessionAttributes) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorizationHeader != null) {
            accessor.setNativeHeader("Authorization", authorizationHeader);
        }
        if (sessionAttributes != null) {
            accessor.setSessionAttributes(sessionAttributes);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Message<?> stompSubscribeMessage(String destination, UsernamePasswordAuthenticationToken user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (user != null) {
            accessor.setUser(user);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private UsernamePasswordAuthenticationToken authenticated(String email) {
        return new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
    }
}
