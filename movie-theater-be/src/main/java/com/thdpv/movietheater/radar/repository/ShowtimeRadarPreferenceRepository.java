package com.thdpv.movietheater.radar.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.radar.entity.ShowtimeRadarPreference;

public interface ShowtimeRadarPreferenceRepository extends JpaRepository<ShowtimeRadarPreference, UUID> {

    Optional<ShowtimeRadarPreference> findByUserUuidAndDeletedAtIsNull(UUID userUuid);

    Optional<ShowtimeRadarPreference> findByUserUuid(UUID userUuid);

    List<ShowtimeRadarPreference> findByEnabledTrueAndDeletedAtIsNull();
}
