package com.thdpv.movietheater.security;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public CustomUserDetailsService(UserRepository userRepository,
                                    UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email: " + email));

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        List<SimpleGrantedAuthority> authorities = userRoles.stream()
                .map(ur -> new SimpleGrantedAuthority("ROLE_" + ur.getRole().getName().name()))
                .toList();

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword() != null ? user.getPassword() : "",
                authorities);
    }
}
