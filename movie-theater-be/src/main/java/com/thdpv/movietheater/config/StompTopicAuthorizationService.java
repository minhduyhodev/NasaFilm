package com.thdpv.movietheater.config;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

@Service
public class StompTopicAuthorizationService {

    private static final String ADMIN_TOPIC_PREFIX = "/topic/admin/";
    private static final String STAFF_TOPIC_PREFIX = "/topic/staff/";

    public boolean isAdminTopic(String destination) {
        return destination != null && destination.startsWith(ADMIN_TOPIC_PREFIX);
    }

    public boolean isStaffTopic(String destination) {
        return destination != null && destination.startsWith(STAFF_TOPIC_PREFIX);
    }

    public void assertAdminTopicAccess(Authentication authentication) {
        assertAuthenticated(authentication, "Yêu cầu đăng nhập để theo dõi kênh quản trị");
        if (!hasAnyRole(authentication, "ROLE_ADMIN")) {
            throw new AccessDeniedException("Chỉ quản trị viên mới có quyền theo dõi kênh này");
        }
    }

    /** Admin dashboard topics stay admin-only; support inbox topics also allow staff. */
    public void assertAdminOrSupportTopicAccess(Authentication authentication, String destination) {
        assertAuthenticated(authentication, "Yêu cầu đăng nhập để theo dõi kênh quản trị");
        if (isSupportAdminTopic(destination)) {
            if (!hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_STAFF")) {
                throw new AccessDeniedException("Chỉ admin hoặc staff mới có quyền theo dõi kênh hỗ trợ");
            }
            return;
        }
        assertAdminTopicAccess(authentication);
    }

    public boolean isSupportAdminTopic(String destination) {
        if (destination == null) {
            return false;
        }
        return destination.equals("/topic/admin/support")
                || destination.equals("/topic/admin/support-live")
                || destination.startsWith("/topic/admin/support/");
    }

    public void assertStaffTopicAccess(Authentication authentication) {
        assertAuthenticated(authentication, "Yêu cầu đăng nhập để theo dõi kênh nhân viên");
        if (!hasAnyRole(authentication, "ROLE_STAFF", "ROLE_ADMIN")) {
            throw new AccessDeniedException("Chỉ nhân viên hoặc quản trị viên mới có quyền theo dõi kênh này");
        }
    }

    public boolean hasAdminRole(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && hasAnyRole(authentication, "ROLE_ADMIN");
    }

    public boolean hasStaffOrAdminRole(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_STAFF");
    }

    private void assertAuthenticated(Authentication authentication, String message) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException(message);
        }
    }

    private boolean hasAnyRole(Authentication authentication, String... roles) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            for (String role : roles) {
                if (role.equals(value)) {
                    return true;
                }
            }
        }
        return false;
    }
}
