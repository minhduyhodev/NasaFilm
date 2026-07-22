package com.thdpv.movietheater.movie.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;

class VodStreamCookieSupportTest {

    @Test
    void createBuildsHttpOnlyCookieScopedToApiPath() {
        ResponseCookie cookie = VodStreamCookieSupport.create(
                "raw-token",
                OffsetDateTime.now().plusHours(2),
                true,
                "Strict");

        assertEquals(VodStreamCookieSupport.COOKIE_NAME, cookie.getName());
        assertEquals("raw-token", cookie.getValue());
        assertEquals(VodStreamCookieSupport.COOKIE_PATH, cookie.getPath());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
        assertEquals("Strict", cookie.getSameSite());
        assertTrue(cookie.getMaxAge().getSeconds() > 0);
    }

    @Test
    void readReturnsCookieValueWhenPresent() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie(VodStreamCookieSupport.COOKIE_NAME, "cookie-token"));

        assertEquals("cookie-token", VodStreamCookieSupport.read(request));
    }

    @Test
    void readReturnsNullWhenCookieMissing() {
        assertNull(VodStreamCookieSupport.read(new MockHttpServletRequest()));
    }

    @Test
    void rejectsSameSiteNoneWithoutSecureTransport() {
        assertThrows(IllegalArgumentException.class, () -> VodStreamCookieSupport.create(
                "raw-token",
                OffsetDateTime.now().plusHours(1),
                false,
                "None"));
    }
}
