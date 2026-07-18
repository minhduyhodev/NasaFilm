package com.thdpv.movietheater.discover.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.discover.entity.DiscoverQuizOption;

public interface DiscoverQuizOptionRepository extends JpaRepository<DiscoverQuizOption, UUID> {

    List<DiscoverQuizOption> findAllByOrderByOptionGroupAscSortOrderAsc();

    List<DiscoverQuizOption> findByActiveTrueOrderByOptionGroupAscSortOrderAsc();

    List<DiscoverQuizOption> findByOptionGroupAndActiveTrueOrderBySortOrderAsc(String optionGroup);

    Optional<DiscoverQuizOption> findByOptionGroupAndOptionKey(String optionGroup, String optionKey);

    boolean existsByOptionGroupAndOptionKey(String optionGroup, String optionKey);
}
