package com.thdpv.movietheater.user.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.user.entity.UserNotification;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotification, UUID> {

    List<UserNotification> findTop50ByUserUuidOrderByCreatedAtDesc(UUID userUuid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE UserNotification n
            SET n.readAt = CURRENT_TIMESTAMP
            WHERE n.userUuid = :userUuid AND n.readAt IS NULL
            """)
    int markAllRead(@Param("userUuid") UUID userUuid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserNotification n WHERE n.userUuid = :userUuid")
    int deleteAllByUserUuid(@Param("userUuid") UUID userUuid);
}
