package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.response.AdminDashboardResponse;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardStats() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfThisMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);

        // 1. Monthly Revenue & Transactions (Giao dịch)
        Object[] currentStats = (Object[]) entityManager.createNativeQuery("""
                select
                    coalesce(sum(b.total_price), 0) as total_revenue,
                    count(1) as total_transactions
                from booking b
                where b.status = 'CONFIRMED'
                  and b.created_at >= :startOfThisMonth
                """)
                .setParameter("startOfThisMonth", startOfThisMonth)
                .getSingleResult();

        BigDecimal thisMonthRevenue = currentStats != null ? toBigDecimal(currentStats[0]) : BigDecimal.ZERO;
        Long thisMonthTransactions = currentStats != null ? toLong(currentStats[1]) : 0L;

        // 2. Last Month Revenue for Growth calculation
        BigDecimal lastMonthRevenue = toBigDecimal(entityManager.createNativeQuery("""
                select
                    coalesce(sum(b.total_price), 0) as total_revenue
                from booking b
                where b.status = 'CONFIRMED'
                  and b.created_at >= :startOfLastMonth
                  and b.created_at < :startOfThisMonth
                """)
                .setParameter("startOfLastMonth", startOfLastMonth)
                .setParameter("startOfThisMonth", startOfThisMonth)
                .getSingleResult());

        double growth = 0.0;
        if (lastMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            growth = thisMonthRevenue.subtract(lastMonthRevenue)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(lastMonthRevenue, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        } else if (thisMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            growth = 100.0;
        }

        // 3. User Conversion Rate calculation
        Long totalUsers = toLong(entityManager.createNativeQuery("select count(1) from users").getSingleResult());
        Long activeBookingUsers = toLong(entityManager.createNativeQuery("""
                select count(distinct user_uuid)
                from booking
                where status = 'CONFIRMED'
                """).getSingleResult());

        double conversionRate = 0.0;
        if (totalUsers > 0) {
            conversionRate = (activeBookingUsers * 100.0) / totalUsers;
            conversionRate = Math.round(conversionRate * 10.0) / 10.0; // round to 1 decimal place
        }

        // 4. Cinema statistics
        @SuppressWarnings("unchecked")
        List<Object[]> cinemaRows = entityManager.createNativeQuery("""
                select
                    c.name as cinema_name,
                    (
                        select coalesce(sum(b.total_price), 0)
                        from booking b
                        join showtime st on st.uuid = b.showtime_uuid
                        join cinema_room cr2 on cr2.uuid = st.cinema_room_uuid
                        where cr2.cinema_uuid = c.uuid and b.status = 'CONFIRMED'
                    ) as total_revenue,
                    (
                        select count(1)
                        from booking_seat bs
                        join booking b on b.uuid = bs.booking_uuid
                        join showtime st on st.uuid = b.showtime_uuid
                        join cinema_room cr2 on cr2.uuid = st.cinema_room_uuid
                        where cr2.cinema_uuid = c.uuid and b.status = 'CONFIRMED'
                    ) as tickets_sold,
                    (
                        select coalesce(sum(cr2.capacity), 0)
                        from showtime st
                        join cinema_room cr2 on cr2.uuid = st.cinema_room_uuid
                        where cr2.cinema_uuid = c.uuid
                    ) as total_capacity
                from cinema c
                order by total_revenue desc
                """)
                .getResultList();

        List<AdminDashboardResponse.CinemaStat> cinemaStats = new ArrayList<>();
        for (Object[] row : cinemaRows) {
            String cinemaName = stringValue(row[0]);
            BigDecimal revenue = toBigDecimal(row[1]);
            long ticketsSold = toLong(row[2]);
            long totalCapacity = toLong(row[3]);

            double occupancyRate = 0.0;
            if (totalCapacity > 0) {
                occupancyRate = (ticketsSold * 100.0) / totalCapacity;
                occupancyRate = Math.round(occupancyRate * 10.0) / 10.0;
            }

            cinemaStats.add(new AdminDashboardResponse.CinemaStat(cinemaName, revenue, occupancyRate));
        }

        // 5. Genre statistics
        @SuppressWarnings("unchecked")
        List<Object[]> genreRows = entityManager.createNativeQuery("""
                select
                    g.name as genre_name,
                    coalesce((
                        select count(1)
                        from booking_seat bs
                        join booking b on b.uuid = bs.booking_uuid
                        join showtime st on st.uuid = b.showtime_uuid
                        join movie_genre mg on mg.movie_uuid = st.movie_uuid
                        where mg.genre_uuid = g.uuid and b.status = 'CONFIRMED'
                    ), 0) as tickets_sold,
                    coalesce((
                        select sum(cr.capacity)
                        from showtime st
                        join cinema_room cr on cr.uuid = st.cinema_room_uuid
                        join movie_genre mg on mg.movie_uuid = st.movie_uuid
                        where mg.genre_uuid = g.uuid
                    ), 0) as total_capacity
                from genre g
                """)
                .getResultList();

        List<AdminDashboardResponse.GenreStat> genreStats = new ArrayList<>();
        for (Object[] row : genreRows) {
            String genreName = stringValue(row[0]);
            long ticketsSold = toLong(row[1]);
            long totalCapacity = toLong(row[2]);

            double occupancyRate = 0.0;
            if (totalCapacity > 0) {
                occupancyRate = (ticketsSold * 100.0) / totalCapacity;
                occupancyRate = Math.round(occupancyRate * 10.0) / 10.0;
            }

            genreStats.add(new AdminDashboardResponse.GenreStat(genreName, occupancyRate));
        }

        // 6. Top movies by revenue (theater + online)
        @SuppressWarnings("unchecked")
        List<Object[]> movieRows = entityManager.createNativeQuery("""
                select
                    m.uuid as movie_uuid,
                    m.title as movie_title,
                    coalesce(sum(b.total_price), 0) as total_revenue,
                    count(b.uuid) as booking_count,
                    (
                        select mm.media_url
                        from movie_media mm
                        where mm.movie_uuid = m.uuid
                          and mm.media_type = 'POSTER'
                        order by case when mm.is_primary then 0 else 1 end, coalesce(mm.sort_order, 0)
                        limit 1
                    ) as primary_media_url
                from booking b
                left join showtime st on st.uuid = b.showtime_uuid
                inner join movie m on m.uuid = coalesce(b.movie_uuid, st.movie_uuid)
                where b.status = 'CONFIRMED'
                  and coalesce(b.movie_uuid, st.movie_uuid) is not null
                group by m.uuid, m.title
                having coalesce(sum(b.total_price), 0) > 0
                order by total_revenue desc
                limit 10
                """)
                .getResultList();

        List<AdminDashboardResponse.MovieStat> topMovies = new ArrayList<>();
        for (Object[] row : movieRows) {
            UUID movieUuid = row[0] != null ? UUID.fromString(row[0].toString()) : null;
            String movieTitle = stringValue(row[1]);
            BigDecimal revenue = toBigDecimal(row[2]);
            long bookingCount = toLong(row[3]);
            String primaryMediaUrl = stringValue(row[4]);
            if (movieUuid == null || movieTitle.isBlank()) {
                continue;
            }
            topMovies.add(new AdminDashboardResponse.MovieStat(
                    movieUuid,
                    movieTitle,
                    revenue,
                    bookingCount,
                    primaryMediaUrl.isBlank() ? null : primaryMediaUrl
            ));
        }

        return new AdminDashboardResponse(
                thisMonthRevenue,
                thisMonthTransactions,
                growth,
                conversionRate,
                cinemaStats,
                genreStats,
                topMovies
        );
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
