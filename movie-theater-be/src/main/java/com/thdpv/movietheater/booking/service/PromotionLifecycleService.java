package com.thdpv.movietheater.booking.service;

import java.time.OffsetDateTime;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

@Service
public class PromotionLifecycleService {

    public boolean isExpired(Promotion promotion, OffsetDateTime now) {
        return promotion.getEndDate() != null && now.isAfter(promotion.getEndDate());
    }

    public boolean isNotStarted(Promotion promotion, OffsetDateTime now) {
        return promotion.getStartDate() != null && now.isBefore(promotion.getStartDate());
    }

    public boolean isUsageExhausted(Promotion promotion) {
        return promotion.getMaxUsage() != null
                && promotion.getUsedCount() != null
                && promotion.getUsedCount() >= promotion.getMaxUsage();
    }

    public boolean syncStatusIfNeeded(Promotion promotion, OffsetDateTime now) {
        if (promotion.isDeleted()) {
            return false;
        }
        if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
            return false;
        }
        if (isExpired(promotion, now) || isUsageExhausted(promotion)) {
            promotion.setStatus("INACTIVE");
            promotion.setUpdatedAt(now);
            return true;
        }
        return false;
    }

    public void validateSchedule(OffsetDateTime startDate, OffsetDateTime endDate) {
        validateSchedule(startDate, endDate, true);
    }

    public void validateScheduleForUpdate(OffsetDateTime startDate, OffsetDateTime endDate) {
        validateSchedule(startDate, endDate, false);
    }

    private void validateSchedule(OffsetDateTime startDate, OffsetDateTime endDate, boolean requireFutureEnd) {
        OffsetDateTime now = OffsetDateTime.now();

        if (startDate == null || endDate == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ngày bắt đầu và ngày kết thúc không được để trống");
        }

        if (!startDate.isBefore(endDate)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ngày bắt đầu phải trước ngày kết thúc");
        }

        if (requireFutureEnd && !endDate.isAfter(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ngày kết thúc phải sau thời điểm hiện tại");
        }
    }
}
