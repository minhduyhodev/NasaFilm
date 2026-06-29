package com.thdpv.movietheater.movie.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.movie.entity.MovieReviewReport;
import com.thdpv.movietheater.movie.enums.MovieReviewReportStatus;

@Repository
public interface MovieReviewReportRepository extends JpaRepository<MovieReviewReport, UUID> {

    Page<MovieReviewReport> findByStatusOrderByCreatedAtDesc(
            MovieReviewReportStatus status, Pageable pageable);

    long countByStatus(MovieReviewReportStatus status);

    boolean existsByReviewUuidAndReporterUuid(UUID reviewUuid, UUID reporterUuid);

    Optional<MovieReviewReport> findByReviewUuidAndReporterUuid(UUID reviewUuid, UUID reporterUuid);

    long countByReviewUuid(UUID reviewUuid);

    long countByReviewUuidAndStatus(UUID reviewUuid, MovieReviewReportStatus status);

    List<MovieReviewReport> findByReviewUuidAndStatus(UUID reviewUuid, MovieReviewReportStatus status);

    @Query("""
            select r.reviewUuid from MovieReviewReport r
            where r.reporterUuid = :reporterUuid
              and r.reviewUuid in :reviewUuids
            """)
    Set<UUID> findReportedReviewUuids(
            @Param("reporterUuid") UUID reporterUuid,
            @Param("reviewUuids") Collection<UUID> reviewUuids);

    @Query("""
            select r from MovieReviewReport r
            where (:status is null or r.status = :status)
              and (:excludeStatus is null or r.status <> :excludeStatus)
            order by r.createdAt desc
            """)
    Page<MovieReviewReport> searchReports(
            @Param("status") MovieReviewReportStatus status,
            @Param("excludeStatus") MovieReviewReportStatus excludeStatus,
            Pageable pageable);
}
