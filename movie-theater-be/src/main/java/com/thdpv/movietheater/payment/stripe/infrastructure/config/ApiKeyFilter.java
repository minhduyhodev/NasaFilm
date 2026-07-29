package com.thdpv.movietheater.payment.stripe.infrastructure.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Optional machine-to-machine gate for {@code /v1/payments/**}.
 * Skipped when {@code api.key} is unset (browser JWT flow) or when the request already carries a Bearer token.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    @Value("${api.key:}")
    private String configuredApiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (!path.startsWith("/v1/payments")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Local / FE JWT checkout: no shared API key configured → do not block.
        if (!StringUtils.hasText(configuredApiKey)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Browser session already authenticated via JWT — do not also require x-api-key.
        String authorization = request.getHeader("Authorization");
        if (StringUtils.hasText(authorization) && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            filterChain.doFilter(request, response);
            return;
        }

        String requestApiKey = request.getHeader("x-api-key");
        if (requestApiKey == null || !requestApiKey.equals(configuredApiKey)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write("Unauthorized: Invalid or missing API Key");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
