package com.thdpv.movietheater.auth.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.RoleName;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {

    List<UserRole> findByUserId(UUID userId);

    /** ID những user (trong danh sách) có vai trò chỉ định — 1 truy vấn cho nhiều user. */
    @Query("select ur.user.id from UserRole ur where ur.user.id in :ids and ur.role.name = :role")
    List<UUID> findUserIdsByRole(@Param("ids") Collection<UUID> ids, @Param("role") RoleName role);
}
