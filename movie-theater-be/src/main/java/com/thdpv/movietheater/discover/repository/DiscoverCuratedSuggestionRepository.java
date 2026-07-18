package com.thdpv.movietheater.discover.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.discover.entity.DiscoverCuratedSuggestion;

public interface DiscoverCuratedSuggestionRepository extends JpaRepository<DiscoverCuratedSuggestion, UUID> {

    List<DiscoverCuratedSuggestion> findAllByOrderByMoodAscSortOrderAsc();

    List<DiscoverCuratedSuggestion> findByMoodAndActiveTrueOrderBySortOrderAsc(String mood);

    List<DiscoverCuratedSuggestion> findByMoodOrderBySortOrderAsc(String mood);

    Optional<DiscoverCuratedSuggestion> findByMoodAndMovieUuid(String mood, UUID movieUuid);

    boolean existsByMoodAndMovieUuid(String mood, UUID movieUuid);

    boolean existsByMood(String mood);
}
