package com.thdpv.movietheater.cinema.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.cinema.entity.SeatType;

public interface SeatTypeRepository extends JpaRepository<SeatType, UUID> {
    
    Optional<SeatType> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
    
    List<SeatType> findAllByOrderByNameAsc();
}
