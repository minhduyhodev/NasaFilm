package com.thdpv.movietheater.movie.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.movie.entity.Genre;

public interface GenreRepository extends JpaRepository<Genre, UUID> {

    Optional<Genre> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
