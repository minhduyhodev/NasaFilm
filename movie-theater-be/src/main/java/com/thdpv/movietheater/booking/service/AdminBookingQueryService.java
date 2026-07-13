package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.response.AdminBookingListResponse;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;

@Service
public class AdminBookingQueryService {

    private final BookingNativeRepository bookingRepository;

    public AdminBookingQueryService(BookingNativeRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public Page<AdminBookingListResponse> getAdminBookings(
            String keyword,
            String status,
            String cinema,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            Pageable pageable) {
        Pageable effectivePageable = pageable == null || pageable.isUnpaged()
                ? Pageable.unpaged()
                : pageable;

        long total = bookingRepository.countAdminBookings(keyword, status, cinema, startAt, endAt);
        Integer offset = null;
        Integer limit = null;
        if (effectivePageable.isPaged()) {
            offset = (int) effectivePageable.getOffset();
            limit = effectivePageable.getPageSize();
        }

        List<Object[]> rows = bookingRepository.loadAdminBookings(
                keyword, status, cinema, startAt, endAt, offset, limit);
        List<AdminBookingListResponse> responses = mapAdminBookingRows(rows);
        if (effectivePageable.isUnpaged()) {
            int pageSize = Math.max(responses.size(), 1);
            return new PageImpl<>(responses, PageRequest.of(0, pageSize), responses.size());
        }
        return new PageImpl<>(responses, effectivePageable, total);
    }

    @Transactional(readOnly = true)
    public Page<AdminBookingListResponse> getAdminBookings(String keyword, Pageable pageable) {
        return getAdminBookings(keyword, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public List<AdminBookingListResponse> getAdminBookings(String keyword) {
        return getAdminBookings(keyword, Pageable.unpaged()).getContent();
    }

    @Transactional(readOnly = true)
    public List<AdminBookingListResponse> getAdminBookings(String keyword, Integer page, Integer size) {
        if (page == null || size == null || size <= 0) {
            return getAdminBookings(keyword);
        }
        return getAdminBookings(keyword, PageRequest.of(page, size)).getContent();
    }

    private List<AdminBookingListResponse> mapAdminBookingRows(List<Object[]> rows) {
        List<AdminBookingListResponse> responses = new ArrayList<>();
        for (Object[] row : rows) {
            responses.add(new AdminBookingListResponse(
                    toUuid(row[0]),
                    stringValue(row[1]),
                    stringValue(row[2]),
                    stringValue(row[3]),
                    stringValue(row[4]),
                    stringValue(row[9]),
                    stringValue(row[10]),
                    toBigDecimal(row[5]),
                    stringValue(row[6]),
                    bookingRepository.toOffsetDateTime(row[7]),
                    stringValue(row[8])));
        }
        return responses;
    }

    private UUID toUuid(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(value.toString());
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }
}
