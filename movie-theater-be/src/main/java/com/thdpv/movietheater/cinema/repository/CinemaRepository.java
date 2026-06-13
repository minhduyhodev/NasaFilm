package com.thdpv.movietheater.cinema.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.cinema.entity.Cinema;

@Repository
public interface CinemaRepository extends JpaRepository<Cinema, UUID> {
    
    @Query("SELECT c FROM Cinema c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.address) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Cinema> searchCinemas(String keyword, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);
}
