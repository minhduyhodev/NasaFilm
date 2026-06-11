package com.thdpv.movietheater.movie.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.movie.entity.MovieCountry;

public interface MovieCountryRepository extends JpaRepository<MovieCountry, UUID> {

    List<MovieCountry> findByMovie_Uuid(UUID movieUuid);

    boolean existsByCountry_Uuid(UUID countryUuid);
}
