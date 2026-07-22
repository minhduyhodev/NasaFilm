package com.thdpv.movietheater.movie.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockHttpServletRequest;

import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.service.MovieService;
import com.thdpv.movietheater.movie.support.VodStreamCookieSupport;

@ExtendWith(MockitoExtension.class)
class VodControllerTest {

    @Mock
    private BookingService bookingService;

    @Mock
    private MovieService movieService;

    @Mock
    private UserDetails userDetails;

    @InjectMocks
    private VodController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "streamCookieSecure", true);
        ReflectionTestUtils.setField(controller, "streamCookieSameSite", "Lax");
    }

    @Test
    void activateSetsHttpOnlyCookieAndRemovesBearerFromJson() {
        UUID movieUuid = UUID.randomUUID();
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(2);
        VodPlayResponse play = new VodPlayResponse(
                "raw-secret-token",
                "/api/media/stream?key=movie%2Fdemo.mp4",
                expiresAt);
        play.setStreamSessionId("public-session-id");
        when(userDetails.getUsername()).thenReturn("viewer@example.com");
        when(movieService.resolveMovieUuid("demo")).thenReturn(movieUuid);
        when(bookingService.activateVodPlay("viewer@example.com", movieUuid, null)).thenReturn(play);

        ResponseEntity<ApiResponse<VodPlayResponse>> response =
                controller.activateVodPlay(userDetails, "demo", null);

        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        assertTrue(setCookie.contains(VodStreamCookieSupport.COOKIE_NAME + "=raw-secret-token"));
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("Secure"));
        assertTrue(setCookie.contains("Path=/api"));
        assertFalse(setCookie.contains("raw-secret-token; Path=/api/media/stream"));
        assertNotNull(response.getBody());
        assertNull(response.getBody().getData().getStreamToken());
        assertEquals("public-session-id", response.getBody().getData().getStreamSessionId());
    }

    @Test
    void heartbeatPrefersHttpOnlyCookieAndPassesPublicSessionId() {
        UUID movieUuid = UUID.randomUUID();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie(
                VodStreamCookieSupport.COOKIE_NAME,
                "cookie-secret"));
        when(userDetails.getUsername()).thenReturn("viewer@example.com");
        when(movieService.resolveMovieUuid("demo")).thenReturn(movieUuid);

        controller.vodHeartbeat(
                userDetails,
                "demo",
                "public-session-id",
                "header-secret",
                "query-secret",
                90,
                7200,
                request);

        verify(bookingService).vodHeartbeat(
                "viewer@example.com",
                movieUuid,
                "cookie-secret",
                "public-session-id",
                90,
                7200);
    }
}
