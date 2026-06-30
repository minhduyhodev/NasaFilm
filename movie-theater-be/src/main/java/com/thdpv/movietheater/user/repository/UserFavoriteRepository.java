package com.thdpv.movietheater.user.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.user.entity.UserFavorite;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, UUID> {

    List<UserFavorite> findByUserUuidOrderByCreatedAtDesc(UUID userUuid);

    Optional<UserFavorite> findByUserUuidAndMovieUuid(UUID userUuid, UUID movieUuid);

    boolean existsByUserUuidAndMovieUuid(UUID userUuid, UUID movieUuid);

    void deleteByUserUuidAndMovieUuid(UUID userUuid, UUID movieUuid);
}
