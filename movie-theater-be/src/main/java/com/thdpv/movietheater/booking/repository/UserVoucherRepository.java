package com.thdpv.movietheater.booking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.UserVoucher;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, UUID> {

    long countByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    long countByPromotionUuid(UUID promotionUuid);

    long countByUserUuidAndPromotionUuidAndStatus(UUID userUuid, UUID promotionUuid, String status);

    List<UserVoucher> findByUserUuidOrderByRedeemedAtDesc(UUID userUuid);

    Optional<UserVoucher> findFirstByUserUuidAndPromotionUuidAndStatusOrderByRedeemedAtAsc(
            UUID userUuid, UUID promotionUuid, String status);
}
