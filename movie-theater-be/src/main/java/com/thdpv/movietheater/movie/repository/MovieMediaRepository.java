package com.thdpv.movietheater.movie.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.movie.entity.MovieMedia;

public interface MovieMediaRepository extends JpaRepository<MovieMedia, UUID> {

    List<MovieMedia> findByMovie_UuidOrderBySortOrderAsc(UUID movieUuid);

    Optional<MovieMedia> findByUuidAndMovie_Uuid(UUID mediaUuid, UUID movieUuid);
}
