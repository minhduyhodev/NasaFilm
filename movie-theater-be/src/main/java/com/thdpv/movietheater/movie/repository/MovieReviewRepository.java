package com.thdpv.movietheater.movie.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;

@Repository
public interface MovieReviewRepository extends JpaRepository<MovieReview, UUID> {

    @Query("""
            select r from MovieReview r
            where r.movieUuid = :movieUuid
              and r.status = :status
              and (:onlyWithComment = false or (r.comment is not null and trim(r.comment) <> ''))
            """)
    Page<MovieReview> findVisibleReviews(
            @Param("movieUuid") UUID movieUuid,
            @Param("status") MovieReviewStatus status,
            @Param("onlyWithComment") boolean onlyWithComment,
            Pageable pageable);

    @Query(
            value = """
                    select r.* from movie_review r
                    where r.movie_uuid = :movieUuid
                      and r.status = :status
                      and (:onlyWithComment = false or (r.comment is not null and btrim(r.comment) <> ''))
                      and r.vibe_tags @> cast(:vibeTagArrayJson as jsonb)
                    """,
            countQuery = """
                    select count(*) from movie_review r
                    where r.movie_uuid = :movieUuid
                      and r.status = :status
                      and (:onlyWithComment = false or (r.comment is not null and btrim(r.comment) <> ''))
                      and r.vibe_tags @> cast(:vibeTagArrayJson as jsonb)
                    """,
            nativeQuery = true)
    Page<MovieReview> findVisibleReviewsByVibeTag(
            @Param("movieUuid") UUID movieUuid,
            @Param("status") String status,
            @Param("onlyWithComment") boolean onlyWithComment,
            @Param("vibeTagArrayJson") String vibeTagArrayJson,
            Pageable pageable);

    Optional<MovieReview> findByUuidAndMovieUuidAndUserUuid(UUID uuid, UUID movieUuid, UUID userUuid);

    void deleteByUuidAndMovieUuidAndUserUuid(UUID uuid, UUID movieUuid, UUID userUuid);

    long countByMovieUuidAndStatus(UUID movieUuid, MovieReviewStatus status);

    boolean existsByMovieUuidAndUserUuidAndCreatedAtAfter(
            UUID movieUuid, UUID userUuid, OffsetDateTime createdAt);

    @Query("select coalesce(avg(r.rating), 0) from MovieReview r where r.movieUuid = :movieUuid and r.status = :status")
    double averageRatingByMovieUuidAndStatus(
            @Param("movieUuid") UUID movieUuid,
            @Param("status") MovieReviewStatus status);

    @Query("select r.rating, count(r) from MovieReview r where r.movieUuid = :movieUuid and r.status = :status group by r.rating")
    java.util.List<Object[]> countByRatingGroupAndStatus(
            @Param("movieUuid") UUID movieUuid,
            @Param("status") MovieReviewStatus status);

    @Query("""
            select r.movieUuid, count(r), coalesce(avg(r.rating), 0)
            from MovieReview r
            where r.movieUuid in :movieUuids and r.status = :status
            group by r.movieUuid
            """)
    java.util.List<Object[]> aggregateByMovieUuids(
            @Param("movieUuids") Collection<UUID> movieUuids,
            @Param("status") MovieReviewStatus status);

    @Query(
            value = """
                    select elem as tag, count(*) as cnt
                    from movie_review r
                    cross join lateral jsonb_array_elements_text(r.vibe_tags) as elem
                    where r.movie_uuid = :movieUuid
                      and r.status = :status
                      and r.vibe_tags is not null
                      and r.vibe_tags <> 'null'::jsonb
                      and jsonb_array_length(r.vibe_tags) > 0
                    group by elem
                    order by cnt desc
                    """,
            nativeQuery = true)
    java.util.List<Object[]> aggregateVibeTagCountsByMovieUuid(
            @Param("movieUuid") UUID movieUuid,
            @Param("status") String status);

    @Query(
            value = """
                    select count(*) from movie_review r
                    where r.movie_uuid = :movieUuid
                      and r.status = :status
                      and r.vibe_tags is not null
                      and r.vibe_tags <> 'null'::jsonb
                      and jsonb_array_length(r.vibe_tags) > 0
                    """,
            nativeQuery = true)
    long countTaggedVisibleReviews(
            @Param("movieUuid") UUID movieUuid,
            @Param("status") String status);

    @Query(
            value = """
                    select r.movie_uuid,
                           count(*) filter (
                               where r.vibe_tags is not null
                                 and r.vibe_tags <> 'null'::jsonb
                                 and jsonb_array_length(r.vibe_tags) > 0
                           ) as tagged_count,
                           count(*) filter (
                               where r.vibe_tags @> cast(:theaterTagJson as jsonb)
                           ) as theater_tag_count
                    from movie_review r
                    where r.movie_uuid in :movieUuids
                      and r.status = :status
                    group by r.movie_uuid
                    """,
            nativeQuery = true)
    java.util.List<Object[]> aggregateVibeBadgeByMovieUuids(
            @Param("movieUuids") Collection<UUID> movieUuids,
            @Param("status") String status,
            @Param("theaterTagJson") String theaterTagJson);
}
