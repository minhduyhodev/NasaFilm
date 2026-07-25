package com.thdpv.movietheater.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;

import com.thdpv.movietheater.security.JwtUtils;

@ExtendWith(MockitoExtension.class)
class WebSocketHandshakeAuthInterceptorTest {

    @Mock
    private JwtUtils jwtUtils;

    private WebSocketHandshakeAuthInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketHandshakeAuthInterceptor(jwtUtils);
    }

    @Test
    void shouldStoreValidAccessTokenQueryParam() {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest();
        servletRequest.setParameter("access_token", "valid-jwt");
        when(jwtUtils.validateToken("valid-jwt")).thenReturn(true);

        Map<String, Object> attributes = new HashMap<>();
        boolean allowed = interceptor.beforeHandshake(
                new ServletServerHttpRequest(servletRequest),
                null,
                null,
                attributes);

        assertTrue(allowed);
        assertEquals("valid-jwt", attributes.get(WebSocketHandshakeAuthInterceptor.SESSION_JWT_KEY));
    }

    @Test
    void shouldStoreValidBearerHeaderWhenQueryMissing() {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest();
        servletRequest.addHeader("Authorization", "Bearer header-jwt");
        when(jwtUtils.validateToken("header-jwt")).thenReturn(true);

        Map<String, Object> attributes = new HashMap<>();
        assertTrue(interceptor.beforeHandshake(
                new ServletServerHttpRequest(servletRequest),
                null,
                null,
                attributes));
        assertEquals("header-jwt", attributes.get(WebSocketHandshakeAuthInterceptor.SESSION_JWT_KEY));
    }

    @Test
    void shouldAllowHandshakeWithoutToken() {
        Map<String, Object> attributes = new HashMap<>();
        assertTrue(interceptor.beforeHandshake(
                new ServletServerHttpRequest(new MockHttpServletRequest()),
                null,
                null,
                attributes));
        assertFalse(attributes.containsKey(WebSocketHandshakeAuthInterceptor.SESSION_JWT_KEY));
    }

    @Test
    void shouldNotStoreInvalidToken() {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest();
        servletRequest.setParameter("access_token", "invalid-jwt");
        when(jwtUtils.validateToken("invalid-jwt")).thenReturn(false);

        Map<String, Object> attributes = new HashMap<>();
        assertTrue(interceptor.beforeHandshake(
                new ServletServerHttpRequest(servletRequest),
                null,
                null,
                attributes));
        assertFalse(attributes.containsKey(WebSocketHandshakeAuthInterceptor.SESSION_JWT_KEY));
    }
}
