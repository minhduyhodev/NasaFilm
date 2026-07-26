package com.thdpv.movietheater.security;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.frontend-url:*}")
    private String frontendUrl;

    @Value("${app.swagger.enabled:false}")
    private boolean swaggerEnabled;

    private final JwtAuthTokenFilter jwtAuthTokenFilter;
    private final CustomUserDetailsService customUserDetailsService;
    private final ObjectMapper objectMapper;

    /** Catalog and auth endpoints that remain anonymous. Sensitive admin/debug paths are not listed. */
    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/login",
            "/api/google",
            "/api/refresh",
            "/api/logout",
            "/api/register",
            "/api/register/verify",
            "/api/forgot-password",
            "/api/reset-password",
            "/api/activate-account",
            "/api/movies",
            "/api/movies/**",
            "/api/search",
            "/api/search/**",
            "/api/showtimes",
            "/api/genres",
            "/api/countries",
            "/api/actors",
            "/api/cinemas",
            "/api/cinemas/**",
            "/api/showtimes/*/seat-map",
            "/api/showtimes/*/seat-map/watch",
            "/api/orbit-rooms/feature-status",
            "/api/system-config",
            "/api/media/proxy",
            "/api/media/border",
            "/api/media/stream",
            "/api/payments/config",
            "/api/promotions/public",
            "/api/promotions/validate",
            "/api/combos/active",
            "/api/review-vibe-tags",
            "/api/review-vibe-tags/**",
            "/api/support-ai/chat",
            "/api/support-ai/status",
            "/api/support-live/availability",
            "/ws/**",
            "/stomp/**",
            "/actuator/health",
            "/actuator/health/**",
            "/v1/payments/**",
            "/v1/webhooks/**"
    };

    private static final String[] SWAGGER_ENDPOINTS = {
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
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> writeErrorResponse(response,
                                ErrorCode.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, accessDeniedException) -> writeErrorResponse(response,
                                ErrorCode.FORBIDDEN)))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    if (swaggerEnabled) {
                        auth.requestMatchers(SWAGGER_ENDPOINTS).permitAll();
                    }
                    auth.requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                            .anyRequest().authenticated();
                })
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        if ("*".equals(frontendUrl)) {
            configuration.addAllowedOriginPattern("*");
        } else {
            configuration.setAllowedOrigins(List.of(frontendUrl));
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of(
                "Authorization", "Cache-Control", "Content-Type", "Accept",
                "Range", "X-Stream-Token", "X-Stream-Session", "X-Request-ID", "x-api-key"));
        configuration.setExposedHeaders(List.of(
                "Authorization", "Accept-Ranges", "Content-Range", "Content-Length", "X-Request-ID"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private void writeErrorResponse(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getHttpStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(errorCode));
    }
}
