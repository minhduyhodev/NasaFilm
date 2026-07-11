package com.thdpv.movietheater.security;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.thdpv.movietheater.auth.repository.RolePermissionRepository;
import com.thdpv.movietheater.auth.repository.UserPermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;

    /** Short TTL so role/permission changes apply quickly without hitting DB every request. */
    private final Cache<String, UserDetails> userDetailsCache = Caffeine.newBuilder()
            .expireAfterWrite(60, TimeUnit.SECONDS)
            .maximumSize(2_000)
            .build();

    public CustomUserDetailsService(UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository,
            UserPermissionRepository userPermissionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userPermissionRepository = userPermissionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String loginIdentifier) throws UsernameNotFoundException {
        if (loginIdentifier == null || loginIdentifier.isBlank()) {
            throw new UsernameNotFoundException("User not found with identifier: " + loginIdentifier);
        }
        String cacheKey = loginIdentifier.trim().toLowerCase();
        return userDetailsCache.get(cacheKey, this::loadUncached);
    }

    public void evictByEmail(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        userDetailsCache.invalidate(email.trim().toLowerCase());
    }

    public void evictAll() {
        userDetailsCache.invalidateAll();
    }

    private UserDetails loadUncached(String cacheKey) {
        User user = userRepository.findByEmailIgnoreCase(cacheKey)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with identifier: " + cacheKey));

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        Set<SimpleGrantedAuthority> authorities = new LinkedHashSet<>();
        for (UserRole userRole : userRoles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + userRole.getRole().getName().name()));
        }

        List<UUID> adminRoleIds = userRoles.stream()
                .filter(ur -> ur.getRole().getName() == com.thdpv.movietheater.user.enums.RoleName.ADMIN)
                .map(ur -> ur.getRole().getId())
                .toList();
        if (!adminRoleIds.isEmpty()) {
            List<String> permissions = rolePermissionRepository.findPermissionNamesByRoleIds(adminRoleIds);
            permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
        }

        List<String> userPermissions = userPermissionRepository.findPermissionNamesByUserId(user.getId());
        userPermissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword() != null ? user.getPassword() : "",
                authorities);
    }
}
