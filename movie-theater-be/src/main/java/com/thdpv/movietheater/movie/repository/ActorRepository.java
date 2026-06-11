package com.thdpv.movietheater.movie.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.thdpv.movietheater.movie.entity.Actor;

public interface ActorRepository extends JpaRepository<Actor, UUID>, JpaSpecificationExecutor<Actor> {

    Optional<Actor> findByFullNameIgnoreCase(String fullName);

    boolean existsByFullNameIgnoreCase(String fullName);

    boolean existsByCountry_Uuid(UUID countryUuid);
}
