package com.thdpv.movietheater.movie.repository;

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
}
