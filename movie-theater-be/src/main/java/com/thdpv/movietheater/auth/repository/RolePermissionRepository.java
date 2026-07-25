package com.thdpv.movietheater.auth.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.user.entity.RolePermission;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {

    @Query(value = """
            select distinct p.name
            from role_permissions rp
            join permissions p on p.uuid = rp.permission_id
            where rp.role_id in (:roleIds)
            """, nativeQuery = true)
    List<String> findPermissionNamesByRoleIds(@Param("roleIds") List<UUID> roleIds);
}
