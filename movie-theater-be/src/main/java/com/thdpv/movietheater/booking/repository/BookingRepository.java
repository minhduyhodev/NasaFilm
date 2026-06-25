package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.Booking;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    boolean existsByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    long countByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    @Query("""
            SELECT b.promotionUuid, COUNT(b)
            FROM Booking b
            WHERE b.userUuid = :userUuid AND b.promotionUuid IN :promotionUuids
            GROUP BY b.promotionUuid
            """)
    List<Object[]> countByUserAndPromotionGroup(
            @Param("userUuid") UUID userUuid,
            @Param("promotionUuids") Collection<UUID> promotionUuids);

    @Query("""
            SELECT DISTINCT b.promotionUuid
            FROM Booking b
            WHERE b.userUuid = :userUuid AND b.promotionUuid IN :promotionUuids
            """)
    List<UUID> findUsedPromotionUuidsForUser(
            @Param("userUuid") UUID userUuid,
            @Param("promotionUuids") Collection<UUID> promotionUuids);

    List<Booking> findByShowtimeUuid(UUID showtimeUuid);
    java.util.Optional<Booking> findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(UUID userUuid, UUID movieUuid, String bookingType, String status);
    List<Booking> findByUserUuidAndBookingTypeAndStatus(UUID userUuid, String bookingType, String status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Booking b set b.status = :newStatus, b.updatedAt = :now where b.uuid = :uuid and b.status = :expectedStatus")
    int updateStatusIf(@Param("uuid") UUID uuid,
            @Param("expectedStatus") String expectedStatus,
            @Param("newStatus") String newStatus,
            @Param("now") OffsetDateTime now);
}
