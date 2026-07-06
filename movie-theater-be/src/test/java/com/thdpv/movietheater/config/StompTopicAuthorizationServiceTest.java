package com.thdpv.movietheater.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class StompTopicAuthorizationServiceTest {

    private StompTopicAuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new StompTopicAuthorizationService();
    }

    @Test
    void adminTopicShouldRequireAdminRole() {
        var customer = auth("ROLE_CUSTOMER");
        assertThrows(AccessDeniedException.class, () -> service.assertAdminTopicAccess(customer));

        var admin = auth("ROLE_ADMIN");
        assertDoesNotThrow(() -> service.assertAdminTopicAccess(admin));
    }

    @Test
    void staffTopicShouldAllowStaffOrAdmin() {
        var customer = auth("ROLE_CUSTOMER");
        assertThrows(AccessDeniedException.class, () -> service.assertStaffTopicAccess(customer));

        var staff = auth("ROLE_STAFF");
        assertDoesNotThrow(() -> service.assertStaffTopicAccess(staff));

        var admin = auth("ROLE_ADMIN");
        assertDoesNotThrow(() -> service.assertStaffTopicAccess(admin));
    }

    @Test
    void hasAdminRoleShouldDetectAdminAuthority() {
        var admin = auth("ROLE_ADMIN");
        var customer = auth("ROLE_CUSTOMER");
        assertTrue(service.hasAdminRole(admin));
        assertFalse(service.hasAdminRole(customer));
        assertFalse(service.hasAdminRole(null));
    }

    private UsernamePasswordAuthenticationToken auth(String role) {
        return new UsernamePasswordAuthenticationToken(
                "user@example.com",
                null,
                List.of(new SimpleGrantedAuthority(role)));
    }
}
