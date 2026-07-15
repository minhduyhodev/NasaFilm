package com.thdpv.movietheater.hr.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.hr.dto.request.AdjustmentRequest;
import com.thdpv.movietheater.hr.dto.request.PayrollPeriodCreateRequest;
import com.thdpv.movietheater.hr.dto.response.AdjustmentResponse;
import com.thdpv.movietheater.hr.dto.response.PayrollPeriodResponse;
import com.thdpv.movietheater.hr.dto.response.PayslipResponse;
import com.thdpv.movietheater.hr.entity.Attendance;
import com.thdpv.movietheater.hr.entity.EmployeeProfile;
import com.thdpv.movietheater.hr.entity.Holiday;
import com.thdpv.movietheater.hr.entity.PayrollPeriod;
import com.thdpv.movietheater.hr.entity.Payslip;
import com.thdpv.movietheater.hr.entity.PayslipAdjustment;
import com.thdpv.movietheater.hr.enums.AdjustmentType;
import com.thdpv.movietheater.hr.enums.ApprovalStatus;
import com.thdpv.movietheater.hr.enums.DayType;
import com.thdpv.movietheater.hr.enums.PayrollPeriodStatus;
import com.thdpv.movietheater.hr.enums.PayslipStatus;
import com.thdpv.movietheater.hr.repository.AttendanceRepository;
import com.thdpv.movietheater.hr.repository.HolidayRepository;
import com.thdpv.movietheater.hr.repository.PayrollPeriodRepository;
import com.thdpv.movietheater.hr.repository.PayslipAdjustmentRepository;
import com.thdpv.movietheater.hr.repository.PayslipRepository;
import com.thdpv.movietheater.user.entity.User;

@Service
public class PayrollService {

    private static final BigDecimal SIXTY = new BigDecimal("60");

    private final PayrollPeriodRepository payrollPeriodRepository;
    private final PayslipRepository payslipRepository;
    private final PayslipAdjustmentRepository adjustmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final HolidayRepository holidayRepository;
    private final EmployeeProfileService employeeProfileService;
    private final HrDirectory directory;

    public PayrollService(PayrollPeriodRepository payrollPeriodRepository,
            PayslipRepository payslipRepository,
            PayslipAdjustmentRepository adjustmentRepository,
            AttendanceRepository attendanceRepository,
            HolidayRepository holidayRepository,
            EmployeeProfileService employeeProfileService,
            HrDirectory directory) {
        this.payrollPeriodRepository = payrollPeriodRepository;
        this.payslipRepository = payslipRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.holidayRepository = holidayRepository;
        this.employeeProfileService = employeeProfileService;
        this.directory = directory;
    }

    // ------------------------------------------------------------------
    // Periods
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<PayrollPeriodResponse> listPeriods() {
        return payrollPeriodRepository.findAllByOrderByPeriodYearDescPeriodMonthDesc().stream()
                .map(this::toPeriodResponse)
                .toList();
    }

    @Transactional
    public PayrollPeriodResponse createPeriod(PayrollPeriodCreateRequest request, UUID actorId) {
        int year = request.year();
        int month = request.month();
        payrollPeriodRepository.findByPeriodYearAndPeriodMonth(year, month).ifPresent(p -> {
            throw new AppException(ErrorCode.HR_PERIOD_EXISTS);
        });
        YearMonth ym = YearMonth.of(year, month);
        PayrollPeriod period = new PayrollPeriod();
        period.setUuid(UUID.randomUUID());
        period.setPeriodYear(year);
        period.setPeriodMonth(month);
        period.setLabel(String.format("%04d-%02d", year, month));
        period.setStartDate(ym.atDay(1));
        period.setEndDate(ym.atEndOfMonth());
        period.setStatus(PayrollPeriodStatus.OPEN);
        period.setCreatedAt(AppTimeZones.now());
        period.setUpdatedAt(AppTimeZones.now());
        period.setCreatedBy(actorId);
        payrollPeriodRepository.save(period);
        return toPeriodResponse(period);
    }

    @Transactional
    public PayrollPeriodResponse generate(UUID periodUuid, UUID actorId) {
        PayrollPeriod period = requirePeriod(periodUuid);
        if (period.getStatus() == PayrollPeriodStatus.APPROVED || period.getStatus() == PayrollPeriodStatus.PAID) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Kỳ lương đã duyệt/đã trả, không thể sinh lại phiếu");
        }
        payslipRepository.deleteByPayrollPeriodUuid(periodUuid);

        List<Attendance> approved = attendanceRepository.findByApprovalStatusAndWorkDateBetween(
                ApprovalStatus.APPROVED, period.getStartDate(), period.getEndDate());
        List<PayslipAdjustment> adjustments = adjustmentRepository
                .findByPayrollPeriodUuidOrderByCreatedAtDesc(periodUuid);

        Map<UUID, List<Attendance>> attByUser = approved.stream()
                .collect(Collectors.groupingBy(Attendance::getUserUuid));
        Map<UUID, List<PayslipAdjustment>> adjByUser = adjustments.stream()
                .collect(Collectors.groupingBy(PayslipAdjustment::getUserUuid));
        Map<LocalDate, Holiday> holidays = holidayMap(period);

        Set<UUID> userIds = new LinkedHashSet<>();
        userIds.addAll(attByUser.keySet());
        userIds.addAll(adjByUser.keySet());

        OffsetDateTime now = AppTimeZones.now();
        for (UUID userId : userIds) {
            Payslip slip = new Payslip();
            slip.setUuid(UUID.randomUUID());
            slip.setPayrollPeriodUuid(periodUuid);
            slip.setUserUuid(userId);
            slip.setStatus(PayslipStatus.DRAFT);
            slip.setCreatedAt(now);
            computeInto(slip, userId,
                    attByUser.getOrDefault(userId, List.of()),
                    adjByUser.getOrDefault(userId, List.of()),
                    holidays);
            payslipRepository.save(slip);
        }

        period.setStatus(PayrollPeriodStatus.GENERATED);
        period.setGeneratedAt(now);
        period.setUpdatedAt(now);
        payrollPeriodRepository.save(period);
        return toPeriodResponse(period);
    }

    @Transactional
    public PayrollPeriodResponse approve(UUID periodUuid, UUID actorId) {
        PayrollPeriod period = requirePeriod(periodUuid);
        if (period.getStatus() != PayrollPeriodStatus.GENERATED) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Chỉ duyệt được kỳ lương đã sinh phiếu");
        }
        OffsetDateTime now = AppTimeZones.now();
        List<Payslip> slips = payslipRepository.findByPayrollPeriodUuid(periodUuid);
        if (slips.isEmpty()) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Kỳ lương chưa có phiếu lương nào để duyệt");
        }
        for (Payslip slip : slips) {
            slip.setStatus(PayslipStatus.APPROVED);
            slip.setApprovedBy(actorId);
            slip.setApprovedAt(now);
            slip.setUpdatedAt(now);
        }
        payslipRepository.saveAll(slips);
        period.setStatus(PayrollPeriodStatus.APPROVED);
        period.setApprovedBy(actorId);
        period.setApprovedAt(now);
        period.setUpdatedAt(now);
        payrollPeriodRepository.save(period);
        return toPeriodResponse(period);
    }

    @Transactional
    public PayrollPeriodResponse markPaid(UUID periodUuid, UUID actorId) {
        PayrollPeriod period = requirePeriod(periodUuid);
        if (period.getStatus() != PayrollPeriodStatus.APPROVED) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Chỉ chi trả được kỳ lương đã duyệt");
        }
        OffsetDateTime now = AppTimeZones.now();
        List<Payslip> slips = payslipRepository.findByPayrollPeriodUuid(periodUuid);
        for (Payslip slip : slips) {
            slip.setStatus(PayslipStatus.PAID);
            slip.setPaidAt(now);
            slip.setUpdatedAt(now);
        }
        payslipRepository.saveAll(slips);
        period.setStatus(PayrollPeriodStatus.PAID);
        period.setPaidAt(now);
        period.setUpdatedAt(now);
        payrollPeriodRepository.save(period);
        return toPeriodResponse(period);
    }

    /**
     * Xóa kỳ lương cùng phiếu lương nháp và các khoản điều chỉnh của kỳ đó.
     * Chỉ chặn khi kỳ đã duyệt/đã trả và đang thực sự có phiếu lương (dữ liệu tài chính).
     */
    @Transactional
    public void deletePeriod(UUID periodUuid) {
        PayrollPeriod period = requirePeriod(periodUuid);
        List<Payslip> slips = payslipRepository.findByPayrollPeriodUuid(periodUuid);
        boolean locked = (period.getStatus() == PayrollPeriodStatus.APPROVED
                || period.getStatus() == PayrollPeriodStatus.PAID) && !slips.isEmpty();
        if (locked) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Không thể xóa kỳ lương đã duyệt/đã chi trả và đang có phiếu lương");
        }
        List<PayslipAdjustment> adjustments = adjustmentRepository
                .findByPayrollPeriodUuidOrderByCreatedAtDesc(periodUuid);
        if (!adjustments.isEmpty()) {
            adjustmentRepository.deleteAll(adjustments);
        }
        payslipRepository.deleteByPayrollPeriodUuid(periodUuid);
        payrollPeriodRepository.delete(period);
    }

    @Transactional(readOnly = true)
    public List<PayslipResponse> listPayslips(UUID periodUuid) {
        PayrollPeriod period = requirePeriod(periodUuid);
        List<Payslip> slips = payslipRepository.findByPayrollPeriodUuid(periodUuid);
        Map<UUID, User> users = directory.usersByIds(
                slips.stream().map(Payslip::getUserUuid).collect(Collectors.toSet()));
        Map<UUID, List<PayslipAdjustment>> adjByUser = adjustmentRepository
                .findByPayrollPeriodUuidOrderByCreatedAtDesc(periodUuid).stream()
                .collect(Collectors.groupingBy(PayslipAdjustment::getUserUuid));
        return slips.stream()
                .map(slip -> toPayslipResponse(slip, period, users.get(slip.getUserUuid()),
                        adjByUser.getOrDefault(slip.getUserUuid(), List.of())))
                .sorted((a, b) -> b.netPay().compareTo(a.netPay()))
                .toList();
    }

    // ------------------------------------------------------------------
    // Adjustments (bonus / deduction)
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdjustmentResponse> listAdjustments(UUID periodUuid) {
        return adjustmentRepository.findByPayrollPeriodUuidOrderByCreatedAtDesc(periodUuid).stream()
                .map(PayrollService::toAdjustmentResponse)
                .toList();
    }

    @Transactional
    public AdjustmentResponse addAdjustment(AdjustmentRequest request, UUID actorId) {
        PayrollPeriod period = requirePeriod(request.payrollPeriodUuid());
        if (period.getStatus() == PayrollPeriodStatus.APPROVED || period.getStatus() == PayrollPeriodStatus.PAID) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Kỳ lương đã chốt, không thể thêm thưởng/khấu trừ");
        }
        directory.requireUser(request.userId());
        PayslipAdjustment adjustment = new PayslipAdjustment();
        adjustment.setUuid(UUID.randomUUID());
        adjustment.setPayrollPeriodUuid(request.payrollPeriodUuid());
        adjustment.setUserUuid(request.userId());
        adjustment.setAdjustmentType(request.type());
        adjustment.setAmount(request.amount());
        adjustment.setReason(request.reason());
        adjustment.setCreatedAt(AppTimeZones.now());
        adjustment.setCreatedBy(actorId);
        adjustmentRepository.save(adjustment);
        if (period.getStatus() == PayrollPeriodStatus.GENERATED) {
            recomputeUserPayslip(period, request.userId());
        }
        return toAdjustmentResponse(adjustment);
    }

    @Transactional
    public void deleteAdjustment(UUID uuid) {
        PayslipAdjustment adjustment = adjustmentRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Khoản điều chỉnh không tồn tại"));
        PayrollPeriod period = requirePeriod(adjustment.getPayrollPeriodUuid());
        if (period.getStatus() == PayrollPeriodStatus.APPROVED || period.getStatus() == PayrollPeriodStatus.PAID) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Kỳ lương đã chốt, không thể xóa thưởng/khấu trừ");
        }
        UUID userId = adjustment.getUserUuid();
        adjustmentRepository.delete(adjustment);
        if (period.getStatus() == PayrollPeriodStatus.GENERATED) {
            recomputeUserPayslip(period, userId);
        }
    }

    // ------------------------------------------------------------------
    // Self-service
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<PayslipResponse> listMyPayslips(UUID userId) {
        List<Payslip> slips = payslipRepository.findByUserUuidAndStatusInOrderByCreatedAtDesc(
                userId, List.of(PayslipStatus.APPROVED, PayslipStatus.PAID));
        return slips.stream().map(slip -> {
            PayrollPeriod period = payrollPeriodRepository.findById(slip.getPayrollPeriodUuid()).orElse(null);
            List<PayslipAdjustment> adjustments = adjustmentRepository
                    .findByPayrollPeriodUuidAndUserUuid(slip.getPayrollPeriodUuid(), userId);
            return toPayslipResponse(slip, period, directory.requireUser(userId), adjustments);
        }).toList();
    }

    @Transactional(readOnly = true)
    public PayslipResponse getMyPayslip(UUID userId, UUID payslipUuid) {
        Payslip slip = payslipRepository.findById(payslipUuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_PAYSLIP_NOT_FOUND));
        if (!slip.getUserUuid().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (slip.getStatus() == PayslipStatus.DRAFT) {
            throw new AppException(ErrorCode.HR_PAYSLIP_NOT_FOUND);
        }
        PayrollPeriod period = payrollPeriodRepository.findById(slip.getPayrollPeriodUuid()).orElse(null);
        List<PayslipAdjustment> adjustments = adjustmentRepository
                .findByPayrollPeriodUuidAndUserUuid(slip.getPayrollPeriodUuid(), userId);
        return toPayslipResponse(slip, period, directory.requireUser(userId), adjustments);
    }

    // ------------------------------------------------------------------
    // Computation helpers
    // ------------------------------------------------------------------

    private void recomputeUserPayslip(PayrollPeriod period, UUID userId) {
        List<Attendance> approved = attendanceRepository
                .findByApprovalStatusAndWorkDateBetween(ApprovalStatus.APPROVED, period.getStartDate(), period.getEndDate())
                .stream().filter(a -> a.getUserUuid().equals(userId)).toList();
        List<PayslipAdjustment> userAdjustments = adjustmentRepository
                .findByPayrollPeriodUuidAndUserUuid(period.getUuid(), userId);
        Map<LocalDate, Holiday> holidays = holidayMap(period);

        Payslip slip = payslipRepository.findByPayrollPeriodUuidAndUserUuid(period.getUuid(), userId)
                .orElseGet(() -> {
                    Payslip fresh = new Payslip();
                    fresh.setUuid(UUID.randomUUID());
                    fresh.setPayrollPeriodUuid(period.getUuid());
                    fresh.setUserUuid(userId);
                    fresh.setStatus(PayslipStatus.DRAFT);
                    fresh.setCreatedAt(AppTimeZones.now());
                    return fresh;
                });
        if (approved.isEmpty() && userAdjustments.isEmpty()) {
            if (slip.getCreatedAt() != null && slip.getUuid() != null
                    && payslipRepository.findById(slip.getUuid()).isPresent()) {
                payslipRepository.delete(slip);
            }
            return;
        }
        computeInto(slip, userId, approved, userAdjustments, holidays);
        payslipRepository.save(slip);
    }

    private void computeInto(Payslip slip, UUID userId, List<Attendance> attendance,
            List<PayslipAdjustment> adjustments, Map<LocalDate, Holiday> holidays) {
        EmployeeProfile profile = employeeProfileService.resolveOrDefault(userId);
        BigDecimal hourlyRate = profile.getHourlyRate() != null ? profile.getHourlyRate() : BigDecimal.ZERO;

        int regularMinutes = 0;
        int otMinutes = 0;
        BigDecimal otPay = BigDecimal.ZERO;
        for (Attendance a : attendance) {
            regularMinutes += a.getRegularMinutes();
            int approvedOt = a.getOtMinutesApproved();
            otMinutes += approvedOt;
            if (approvedOt > 0) {
                BigDecimal multiplier = otMultiplier(profile, a.getDayType(), a.getWorkDate(), holidays);
                BigDecimal segment = hourlyRate
                        .multiply(multiplier)
                        .multiply(BigDecimal.valueOf(approvedOt))
                        .divide(SIXTY, 2, RoundingMode.HALF_UP);
                otPay = otPay.add(segment);
            }
        }

        BigDecimal regularPay = hourlyRate
                .multiply(BigDecimal.valueOf(regularMinutes))
                .divide(SIXTY, 2, RoundingMode.HALF_UP);

        BigDecimal bonusTotal = BigDecimal.ZERO;
        BigDecimal deductionTotal = BigDecimal.ZERO;
        for (PayslipAdjustment adj : adjustments) {
            if (adj.getAdjustmentType() == AdjustmentType.BONUS) {
                bonusTotal = bonusTotal.add(adj.getAmount());
            } else {
                deductionTotal = deductionTotal.add(adj.getAmount());
            }
        }

        BigDecimal gross = regularPay.add(otPay).add(bonusTotal);
        BigDecimal net = gross.subtract(deductionTotal);

        slip.setRegularMinutes(regularMinutes);
        slip.setOtMinutes(otMinutes);
        slip.setHourlyRate(hourlyRate);
        slip.setRegularPay(regularPay);
        slip.setOtPay(otPay);
        slip.setBonusTotal(bonusTotal);
        slip.setDeductionTotal(deductionTotal);
        slip.setGrossPay(gross);
        slip.setNetPay(net);
        slip.setUpdatedAt(AppTimeZones.now());
    }

    private BigDecimal otMultiplier(EmployeeProfile profile, DayType dayType, LocalDate date,
            Map<LocalDate, Holiday> holidays) {
        if (dayType == DayType.HOLIDAY) {
            Holiday holiday = holidays.get(date);
            if (holiday != null && holiday.getMultiplierOverride() != null) {
                return holiday.getMultiplierOverride();
            }
            return profile.getOtMultiplierHoliday();
        }
        if (dayType == DayType.WEEKEND) {
            return profile.getOtMultiplierWeekend();
        }
        return profile.getOtMultiplierWeekday();
    }

    private Map<LocalDate, Holiday> holidayMap(PayrollPeriod period) {
        Map<LocalDate, Holiday> map = new LinkedHashMap<>();
        for (Holiday holiday : holidayRepository
                .findByHolidayDateBetweenOrderByHolidayDateAsc(period.getStartDate(), period.getEndDate())) {
            map.put(holiday.getHolidayDate(), holiday);
        }
        return map;
    }

    private PayrollPeriod requirePeriod(UUID uuid) {
        return payrollPeriodRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_PERIOD_NOT_FOUND));
    }

    // ------------------------------------------------------------------
    // Mapping
    // ------------------------------------------------------------------

    private PayrollPeriodResponse toPeriodResponse(PayrollPeriod period) {
        List<Payslip> slips = payslipRepository.findByPayrollPeriodUuid(period.getUuid());
        BigDecimal totalNet = slips.stream()
                .map(Payslip::getNetPay)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PayrollPeriodResponse(
                period.getUuid(),
                period.getPeriodYear(),
                period.getPeriodMonth(),
                period.getLabel(),
                period.getStartDate(),
                period.getEndDate(),
                period.getStatus().name(),
                slips.size(),
                totalNet,
                period.getGeneratedAt(),
                period.getApprovedAt(),
                period.getPaidAt(),
                period.getCreatedAt());
    }

    private PayslipResponse toPayslipResponse(Payslip slip, PayrollPeriod period, User user,
            List<PayslipAdjustment> adjustments) {
        List<AdjustmentResponse> adjResponses = adjustments.stream()
                .map(PayrollService::toAdjustmentResponse)
                .toList();
        return new PayslipResponse(
                slip.getUuid(),
                slip.getPayrollPeriodUuid(),
                period != null ? period.getLabel() : null,
                period != null ? period.getPeriodYear() : 0,
                period != null ? period.getPeriodMonth() : 0,
                slip.getUserUuid(),
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                slip.getRegularMinutes(),
                slip.getOtMinutes(),
                slip.getHourlyRate(),
                slip.getRegularPay(),
                slip.getOtPay(),
                slip.getBonusTotal(),
                slip.getDeductionTotal(),
                slip.getGrossPay(),
                slip.getNetPay(),
                slip.getStatus().name(),
                slip.getNote(),
                slip.getApprovedAt(),
                slip.getPaidAt(),
                adjResponses);
    }

    private static AdjustmentResponse toAdjustmentResponse(PayslipAdjustment adj) {
        return new AdjustmentResponse(
                adj.getUuid(),
                adj.getPayrollPeriodUuid(),
                adj.getUserUuid(),
                adj.getAdjustmentType().name(),
                adj.getAmount(),
                adj.getReason(),
                adj.getCreatedAt());
    }
}
