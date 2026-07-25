package com.thdpv.movietheater.auth.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.user.entity.UserPermission;

public interface UserPermissionRepository extends JpaRepository<UserPermission, UUID> {

    List<UserPermission> findByUserId(UUID userId);

    /** Projection (userId, tên quyền) để tra quyền cho nhiều nhân viên trong 1 truy vấn (tránh N+1). */
    interface UserPermissionRow {
        UUID getUserId();

        String getName();
    }

    @Query("""
            select up.userId as userId, p.name as name
            from UserPermission up, Permission p
            where p.id = up.permissionId and up.userId in :ids
            """)
    List<UserPermissionRow> findPermissionRowsByUserIds(@Param("ids") Collection<UUID> ids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserPermission up WHERE up.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    @Query(value = """
            select distinct p.name
            from user_permissions up
            join permissions p on p.uuid = up.permission_id
            where up.user_id = :userId
            """, nativeQuery = true)
    List<String> findPermissionNamesByUserId(@Param("userId") UUID userId);
}
