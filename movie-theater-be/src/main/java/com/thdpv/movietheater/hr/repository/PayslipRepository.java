package com.thdpv.movietheater.hr.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.hr.entity.Payslip;
import com.thdpv.movietheater.hr.enums.PayslipStatus;

public interface PayslipRepository extends JpaRepository<Payslip, UUID> {

    List<Payslip> findByPayrollPeriodUuid(UUID payrollPeriodUuid);

    Optional<Payslip> findByPayrollPeriodUuidAndUserUuid(UUID payrollPeriodUuid, UUID userUuid);

    List<Payslip> findByUserUuidAndStatusInOrderByCreatedAtDesc(UUID userUuid, Collection<PayslipStatus> statuses);

    void deleteByPayrollPeriodUuid(UUID payrollPeriodUuid);
}
