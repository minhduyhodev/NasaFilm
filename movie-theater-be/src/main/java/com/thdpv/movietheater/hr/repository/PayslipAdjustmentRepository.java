package com.thdpv.movietheater.hr.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.PayslipAdjustment;

public interface PayslipAdjustmentRepository extends JpaRepository<PayslipAdjustment, UUID> {

    List<PayslipAdjustment> findByPayrollPeriodUuidOrderByCreatedAtDesc(UUID payrollPeriodUuid);

    List<PayslipAdjustment> findByPayrollPeriodUuidAndUserUuid(UUID payrollPeriodUuid, UUID userUuid);
}
