package com.thdpv.movietheater.movie.repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.movie.entity.Movie;

public interface MovieRepository extends JpaRepository<Movie, UUID>, JpaSpecificationExecutor<Movie> {

    @Query(value = """
            select exists(
                select 1
                from showtime s
                where s.movie_uuid = :movieUuid
            )
            """, nativeQuery = true)
    boolean existsShowtimeByMovieUuid(@Param("movieUuid") UUID movieUuid);

    @Query(value = """
            select exists(
                select 1
                from booking b
                join showtime s on s.uuid = b.showtime_uuid
                where s.movie_uuid = :movieUuid
            )
            """, nativeQuery = true)
    boolean existsBookingByMovieUuid(@Param("movieUuid") UUID movieUuid);

    @Query(value = """
            select exists(
                select 1
                from booking b
                join showtime s on s.uuid = b.showtime_uuid
                where b.user_uuid = :userUuid
                  and s.movie_uuid = :movieUuid
                  and b.status = 'CONFIRMED'
            )
            """, nativeQuery = true)
    boolean hasConfirmedBookingForMovie(@Param("userUuid") UUID userUuid, @Param("movieUuid") UUID movieUuid);

    boolean existsByTitleIgnoreCase(String title);

    @Query("SELECT m FROM Movie m LEFT JOIN FETCH m.movieMedias WHERE LOWER(m.title) = LOWER(:title)")
    Optional<Movie> findByTitleIgnoreCase(@Param("title") String title);

    @Query("SELECT DISTINCT m FROM Movie m LEFT JOIN FETCH m.movieMedias WHERE m.uuid IN :uuids")
    List<Movie> findAllByIdWithMedias(@Param("uuids") Collection<UUID> uuids);

    @Query("""
            SELECT DISTINCT m FROM Movie m
            LEFT JOIN FETCH m.movieGenres mg
            LEFT JOIN FETCH mg.genre
            WHERE m.uuid IN :uuids
            """)
    List<Movie> findAllByIdWithGenres(@Param("uuids") Collection<UUID> uuids);

    @Query("""
            SELECT DISTINCT m FROM Movie m
            LEFT JOIN FETCH m.movieCountries mc
            LEFT JOIN FETCH mc.country
            WHERE m.uuid IN :uuids
            """)
    List<Movie> findAllByIdWithCountries(@Param("uuids") Collection<UUID> uuids);

    @Query(value = """
            SELECT COUNT(*)
            FROM movie m
            LEFT JOIN (
                SELECT DISTINCT s.movie_uuid
                FROM showtime s
                WHERE s.status = 'SCHEDULED'
                  AND s.start_time > :now
            ) upcoming ON upcoming.movie_uuid = m.uuid
            WHERE m.status = 'COMING_SOON'
              AND NOT EXISTS (
                  SELECT 1 FROM showtime s
                  WHERE s.movie_uuid = m.uuid
                    AND s.status IN ('OPEN_FOR_BOOKING', 'SOLD_OUT')
              )
            """, nativeQuery = true)
    long countUpcomingMovies(@Param("now") java.time.OffsetDateTime now);

    @Query(value = """
            SELECT m.uuid
            FROM movie m
            LEFT JOIN (
                SELECT s.movie_uuid, MIN(s.start_time) AS next_start
                FROM showtime s
                WHERE s.status = 'SCHEDULED'
                  AND s.start_time > :now
                GROUP BY s.movie_uuid
            ) upcoming ON upcoming.movie_uuid = m.uuid
            WHERE m.status = 'COMING_SOON'
              AND NOT EXISTS (
                  SELECT 1 FROM showtime s
                  WHERE s.movie_uuid = m.uuid
                    AND s.status IN ('OPEN_FOR_BOOKING', 'SOLD_OUT')
              )
            ORDER BY
              CASE WHEN upcoming.next_start IS NULL THEN 1 ELSE 0 END,
              upcoming.next_start ASC NULLS LAST,
              m.release_date ASC NULLS LAST
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<UUID> findUpcomingMovieUuids(
            @Param("now") java.time.OffsetDateTime now,
            @Param("limit") int limit,
            @Param("offset") long offset);
}
