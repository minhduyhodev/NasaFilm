package com.thdpv.movietheater.security;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.auth.repository.RolePermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

        private final UserRepository userRepository;
        private final UserRoleRepository userRoleRepository;
        private final RolePermissionRepository rolePermissionRepository;

        public CustomUserDetailsService(UserRepository userRepository,
                        UserRoleRepository userRoleRepository,
                        RolePermissionRepository rolePermissionRepository) {
                this.userRepository = userRepository;
                this.userRoleRepository = userRoleRepository;
                this.rolePermissionRepository = rolePermissionRepository;
        }

        @Override
        @Transactional(readOnly = true)
        public UserDetails loadUserByUsername(String loginIdentifier) throws UsernameNotFoundException {
                User user = userRepository.findByEmailIgnoreCase(loginIdentifier)
                                // .or(() -> userRepository.findByUsernameIgnoreCase(loginIdentifier))
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "User not found with identifier: " + loginIdentifier));

                List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                List<UUID> roleIds = new ArrayList<>();
                for (UserRole userRole : userRoles) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + userRole.getRole().getName().name()));
                        roleIds.add(userRole.getRole().getId());
                }

                if (!roleIds.isEmpty()) {
                        List<String> permissions = rolePermissionRepository.findPermissionNamesByRoleIds(roleIds);
                        permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
                }

                return new org.springframework.security.core.userdetails.User(
                                user.getEmail(),
                                user.getPassword() != null ? user.getPassword() : "",
                                authorities);
        }
}
