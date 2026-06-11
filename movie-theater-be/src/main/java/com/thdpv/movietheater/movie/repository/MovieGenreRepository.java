package com.thdpv.movietheater.movie.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.movie.entity.MovieGenre;

public interface MovieGenreRepository extends JpaRepository<MovieGenre, UUID> {

    List<MovieGenre> findByMovie_Uuid(UUID movieUuid);

    boolean existsByGenre_Uuid(UUID genreUuid);
}
