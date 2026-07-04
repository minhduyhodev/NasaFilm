package com.thdpv.movietheater.discover.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.thdpv.movietheater.discover.entity.UserMatchmakerHistory;

public interface UserMatchmakerHistoryRepository extends JpaRepository<UserMatchmakerHistory, UUID> {

    long countByCreatedAtAfter(OffsetDateTime since);

    long countByUserUuidIsNull();

    long countByUserUuidIsNotNull();

    @Query("SELECT h.mood, COUNT(h) FROM UserMatchmakerHistory h GROUP BY h.mood ORDER BY COUNT(h) DESC")
    List<Object[]> countGroupByMood();

    @Query("""
            SELECT h.viewingLocation, COUNT(h)
            FROM UserMatchmakerHistory h
            GROUP BY h.viewingLocation
            ORDER BY COUNT(h) DESC
            """)
    List<Object[]> countGroupByViewingLocation();
}
