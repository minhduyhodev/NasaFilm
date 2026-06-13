package com.thdpv.movietheater.cinema.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.cinema.entity.SeatType;

@Repository
public interface SeatTypeRepository extends JpaRepository<SeatType, UUID> {
    
    Optional<SeatType> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
    
    List<SeatType> findAllByOrderByNameAsc();
}
