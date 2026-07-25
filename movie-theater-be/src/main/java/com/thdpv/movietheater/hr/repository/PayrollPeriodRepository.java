package com.thdpv.movietheater.hr.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.PayrollPeriod;

public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, UUID> {

    Optional<PayrollPeriod> findByPeriodYearAndPeriodMonth(int periodYear, int periodMonth);

    List<PayrollPeriod> findAllByOrderByPeriodYearDescPeriodMonthDesc();
}
