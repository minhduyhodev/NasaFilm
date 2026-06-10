package com.thdpv.movietheater.security;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthTokenFilter jwtAuthTokenFilter;
    private final CustomUserDetailsService customUserDetailsService;
    private final ObjectMapper objectMapper;

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/login",
            "/api/google",
            "/api/refresh",
            "/api/logout",
            "/api/register",
            "/api/register/verify",
            "/api/forgot-password",
            "/api/reset-password",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    };

    public SecurityConfig(
            JwtAuthTokenFilter jwtAuthTokenFilter,
            CustomUserDetailsService customUserDetailsService,
            ObjectMapper objectMapper) {
        this.jwtAuthTokenFilter = jwtAuthTokenFilter;
        this.customUserDetailsService = customUserDetailsService;
        this.objectMapper = objectMapper;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(customUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> writeErrorResponse(response,
                                ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, accessDeniedException) -> writeErrorResponse(response,
                                ErrorCode.FORBIDDEN)))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeErrorResponse(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getHttpStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(errorCode));
    }
}
