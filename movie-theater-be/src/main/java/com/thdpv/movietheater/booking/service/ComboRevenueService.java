package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.response.ComboRevenueResponse;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ComboRevenueService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public ComboRevenueResponse getRevenueStats() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfThisMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);
        OffsetDateTime startOfDaily = now.minusDays(6).withHour(0).withMinute(0).withSecond(0).withNano(0);

        BigDecimal thisMonthRevenue = sumComboRevenue(startOfThisMonth, null);
        BigDecimal lastMonthRevenue = sumComboRevenue(startOfLastMonth, startOfThisMonth);

        double growth = 0.0;
        if (lastMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            growth = thisMonthRevenue.subtract(lastMonthRevenue)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(lastMonthRevenue, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        } else if (thisMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            growth = 100.0;
        }

        Long ordersThisMonth = countComboOrders(startOfThisMonth, null);
        Long itemsThisMonth = sumComboItems(startOfThisMonth, null);

        List<ComboRevenueResponse.ComboRevenueItem> byCombo = loadRevenueByCombo(startOfThisMonth, null);
        List<ComboRevenueResponse.DailyRevenueItem> dailyRevenue = loadDailyRevenue(startOfDaily);

        return new ComboRevenueResponse(
                thisMonthRevenue,
                lastMonthRevenue,
                growth,
                ordersThisMonth,
                itemsThisMonth,
                byCombo,
                dailyRevenue
        );
    }

    private BigDecimal sumComboRevenue(OffsetDateTime from, OffsetDateTime to) {
        StringBuilder sql = new StringBuilder("""
                select coalesce(sum(bc.price), 0)
                from booking_combo bc
                join booking b on b.uuid = bc.booking_uuid
                where b.status = 'CONFIRMED'
                  and b.created_at >= :from
                """);
        if (to != null) {
            sql.append(" and b.created_at < :to");
        }

        var query = entityManager.createNativeQuery(sql.toString())
                .setParameter("from", from);
        if (to != null) {
            query.setParameter("to", to);
        }
        return toBigDecimal(query.getSingleResult());
    }

    private Long countComboOrders(OffsetDateTime from, OffsetDateTime to) {
        StringBuilder sql = new StringBuilder("""
                select count(distinct b.uuid)
                from booking_combo bc
                join booking b on b.uuid = bc.booking_uuid
                where b.status = 'CONFIRMED'
                  and b.created_at >= :from
                """);
        if (to != null) {
            sql.append(" and b.created_at < :to");
        }

        var query = entityManager.createNativeQuery(sql.toString())
                .setParameter("from", from);
        if (to != null) {
            query.setParameter("to", to);
        }
        return toLong(query.getSingleResult());
    }

    private Long sumComboItems(OffsetDateTime from, OffsetDateTime to) {
        StringBuilder sql = new StringBuilder("""
                select coalesce(sum(bc.quantity), 0)
                from booking_combo bc
                join booking b on b.uuid = bc.booking_uuid
                where b.status = 'CONFIRMED'
                  and b.created_at >= :from
                """);
        if (to != null) {
            sql.append(" and b.created_at < :to");
        }

        var query = entityManager.createNativeQuery(sql.toString())
                .setParameter("from", from);
        if (to != null) {
            query.setParameter("to", to);
        }
        return toLong(query.getSingleResult());
    }

    @SuppressWarnings("unchecked")
    private List<ComboRevenueResponse.ComboRevenueItem> loadRevenueByCombo(OffsetDateTime from, OffsetDateTime to) {
        StringBuilder sql = new StringBuilder("""
                select
                    cast(c.uuid as text) as combo_uuid,
                    c.name as combo_name,
                    coalesce(sum(bc.quantity), 0) as qty,
                    coalesce(sum(bc.price), 0) as revenue
                from booking_combo bc
                join combo c on c.uuid = bc.combo_uuid
                join booking b on b.uuid = bc.booking_uuid
                where b.status = 'CONFIRMED'
                  and b.created_at >= :from
                """);
        if (to != null) {
            sql.append(" and b.created_at < :to");
        }
        sql.append("""
                 group by c.uuid, c.name
                 order by revenue desc
                """);

        var query = entityManager.createNativeQuery(sql.toString())
                .setParameter("from", from);
        if (to != null) {
            query.setParameter("to", to);
        }

        List<Object[]> rows = query.getResultList();
        List<ComboRevenueResponse.ComboRevenueItem> items = new ArrayList<>();
        for (Object[] row : rows) {
            items.add(new ComboRevenueResponse.ComboRevenueItem(
                    stringValue(row[0]),
                    stringValue(row[1]),
                    toLong(row[2]),
                    toBigDecimal(row[3])
            ));
        }
        return items;
    }

    @SuppressWarnings("unchecked")
    private List<ComboRevenueResponse.DailyRevenueItem> loadDailyRevenue(OffsetDateTime from) {
        List<Object[]> rows = entityManager.createNativeQuery("""
                select
                    cast(date(b.created_at) as text) as day,
                    coalesce(sum(bc.price), 0) as revenue,
                    count(distinct b.uuid) as order_count
                from booking_combo bc
                join booking b on b.uuid = bc.booking_uuid
                where b.status = 'CONFIRMED'
                  and b.created_at >= :from
                group by date(b.created_at)
                order by day asc
                """)
                .setParameter("from", from)
                .getResultList();

        Map<String, ComboRevenueResponse.DailyRevenueItem> byDay = new HashMap<>();
        for (Object[] row : rows) {
            byDay.put(stringValue(row[0]), new ComboRevenueResponse.DailyRevenueItem(
                    stringValue(row[0]),
                    toBigDecimal(row[1]),
                    toLong(row[2])
            ));
        }

        LocalDate start = from.toLocalDate();
        LocalDate end = LocalDate.now(ZoneOffset.UTC);
        List<ComboRevenueResponse.DailyRevenueItem> result = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            String key = day.format(DATE_FMT);
            result.add(byDay.getOrDefault(key, new ComboRevenueResponse.DailyRevenueItem(key, BigDecimal.ZERO, 0L)));
        }
        return result;
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

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }
}
