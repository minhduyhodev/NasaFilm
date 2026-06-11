package com.thdpv.movietheater.movie.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.movie.entity.MovieActor;

public interface MovieActorRepository extends JpaRepository<MovieActor, UUID> {

    List<MovieActor> findByMovie_Uuid(UUID movieUuid);

    boolean existsByActor_Uuid(UUID actorUuid);
}
