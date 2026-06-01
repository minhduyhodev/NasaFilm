package com.thdpv.movietheater.config.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.enums.RoleName;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByName(RoleName name);
}
