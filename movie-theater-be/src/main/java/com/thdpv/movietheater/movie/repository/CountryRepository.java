package com.thdpv.movietheater.movie.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.movie.entity.Country;

public interface CountryRepository extends JpaRepository<Country, UUID> {

    Optional<Country> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
