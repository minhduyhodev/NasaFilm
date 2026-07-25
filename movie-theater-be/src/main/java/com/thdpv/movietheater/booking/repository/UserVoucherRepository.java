package com.thdpv.movietheater.booking.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.UserVoucher;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, UUID> {

    long countByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    long countByPromotionUuid(UUID promotionUuid);

    long countByUserUuidAndPromotionUuidAndStatus(UUID userUuid, UUID promotionUuid, String status);

    List<UserVoucher> findByUserUuidOrderByRedeemedAtDesc(UUID userUuid);

    @Query("""
            SELECT uv.promotionUuid, COUNT(uv)
            FROM UserVoucher uv
            WHERE uv.promotionUuid IN :promotionUuids
            GROUP BY uv.promotionUuid
            """)
    List<Object[]> countRedeemedGroupByPromotion(@Param("promotionUuids") Collection<UUID> promotionUuids);

    @Query("""
            SELECT uv.promotionUuid, COUNT(uv)
            FROM UserVoucher uv
            WHERE uv.userUuid = :userUuid AND uv.promotionUuid IN :promotionUuids
            GROUP BY uv.promotionUuid
            """)
    List<Object[]> countByUserAndPromotionGroup(
            @Param("userUuid") UUID userUuid,
            @Param("promotionUuids") Collection<UUID> promotionUuids);

    @Query("""
            SELECT uv.promotionUuid
            FROM UserVoucher uv
            WHERE uv.userUuid = :userUuid
              AND uv.promotionUuid IN :promotionUuids
              AND uv.status = :status
            """)
    List<UUID> findPromotionUuidsByUserAndStatus(
            @Param("userUuid") UUID userUuid,
            @Param("promotionUuids") Collection<UUID> promotionUuids,
            @Param("status") String status);

    Optional<UserVoucher> findFirstByBookingUuid(UUID bookingUuid);

    Optional<UserVoucher> findFirstByUserUuidAndPromotionUuidAndStatusOrderByRedeemedAtAsc(
            UUID userUuid, UUID promotionUuid, String status);
}
