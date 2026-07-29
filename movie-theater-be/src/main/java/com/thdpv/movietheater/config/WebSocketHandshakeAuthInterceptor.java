package com.thdpv.movietheater.config;

import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.thdpv.movietheater.security.JwtUtils;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class WebSocketHandshakeAuthInterceptor implements HandshakeInterceptor {

    static final String SESSION_JWT_KEY = "wsJwtToken";

    private final JwtUtils jwtUtils;

    public WebSocketHandshakeAuthInterceptor(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return true;
        }

        HttpServletRequest httpRequest = servletRequest.getServletRequest();
        // Prefer Authorization (not logged in access logs / Referer). Query access_token remains a
        // SockJS fallback because browser SockJS handshakes cannot set custom headers.
        String token = null;
        String authorization = httpRequest.getHeader("Authorization");
        if (StringUtils.hasText(authorization) && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = authorization.substring(7).trim();
        }
        if (!StringUtils.hasText(token)) {
            token = httpRequest.getParameter("access_token");
        }

        if (StringUtils.hasText(token) && jwtUtils.validateToken(token)) {
            attributes.put(SESSION_JWT_KEY, token.trim());
        }
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }
}
