package com.thdpv.movietheater.hr.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.Holiday;

public interface HolidayRepository extends JpaRepository<Holiday, UUID> {

    Optional<Holiday> findByHolidayDate(LocalDate holidayDate);

    boolean existsByHolidayDate(LocalDate holidayDate);

    List<Holiday> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);

    List<Holiday> findAllByOrderByHolidayDateDesc();
}
