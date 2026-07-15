package com.thdpv.movietheater.hr.service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.hr.dto.request.AttendanceUpdateRequest;
import com.thdpv.movietheater.hr.dto.response.AttendanceResponse;
import com.thdpv.movietheater.hr.entity.Attendance;
import com.thdpv.movietheater.hr.entity.Holiday;
import com.thdpv.movietheater.hr.entity.ShiftAssignment;
import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.enums.ApprovalStatus;
import com.thdpv.movietheater.hr.enums.AttendanceStatus;
import com.thdpv.movietheater.hr.enums.DayType;
import com.thdpv.movietheater.hr.enums.ShiftAssignmentStatus;
import com.thdpv.movietheater.hr.repository.AttendanceRepository;
import com.thdpv.movietheater.hr.repository.HolidayRepository;
import com.thdpv.movietheater.hr.repository.ShiftAssignmentRepository;
import com.thdpv.movietheater.user.entity.User;

@Service
public class AttendanceService {

    /** Vào sau giờ ca quá số phút này -> Đi trễ. */
    private static final long LATE_GRACE_MINUTES = 5;
    /** Ra trước giờ tan ca quá số phút này -> Về sớm. */
    private static final long EARLY_LEAVE_GRACE_MINUTES = 5;
    /** OT chỉ tính khi làm quá giờ tan ca ít nhất số phút này. */
    private static final long OT_MIN_THRESHOLD_MINUTES = 15;
    /** Cho phép check-in sớm nhất trước giờ ca. */
    private static final long CHECK_IN_EARLY_WINDOW_MINUTES = 60;
    /** Cho phép check-in trễ nhất sau giờ tan ca (vẫn tính đi trễ). */
    private static final long CHECK_IN_LATE_WINDOW_MINUTES = 30;

    private final AttendanceRepository attendanceRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final HolidayRepository holidayRepository;
    private final HrDirectory directory;
    private final CheckpointCodeService checkpointCodeService;

    public AttendanceService(AttendanceRepository attendanceRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            HolidayRepository holidayRepository,
            HrDirectory directory,
            CheckpointCodeService checkpointCodeService) {
        this.attendanceRepository = attendanceRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.holidayRepository = holidayRepository;
        this.directory = directory;
        this.checkpointCodeService = checkpointCodeService;
    }

    // ------------------------------------------------------------------
    // Self-service
    // ------------------------------------------------------------------

    @Transactional
    public AttendanceResponse checkIn(UUID userId, UUID shiftAssignmentUuid, String verificationCode) {
        ShiftAssignment assignment = requireOwnedAssignment(shiftAssignmentUuid, userId);
        ShiftDefinition shift = directory.requireShift(assignment.getShiftDefinitionUuid());

        if (!checkpointCodeService.verify(verificationCode)) {
            throw new AppException(ErrorCode.HR_CHECKPOINT_CODE_INVALID);
        }

        attendanceRepository.findByShiftAssignmentUuid(shiftAssignmentUuid).ifPresent(a -> {
            throw new AppException(ErrorCode.HR_ALREADY_CHECKED_IN);
        });

        OffsetDateTime now = AppTimeZones.now();
        OffsetDateTime shiftStart = shiftStartAt(assignment.getWorkDate(), shift);
        OffsetDateTime shiftEnd = shiftEndAt(assignment.getWorkDate(), shift);
        if (now.isBefore(shiftStart.minusMinutes(CHECK_IN_EARLY_WINDOW_MINUTES))
                || now.isAfter(shiftEnd.plusMinutes(CHECK_IN_LATE_WINDOW_MINUTES))) {
            throw new AppException(ErrorCode.HR_CHECK_IN_WINDOW_INVALID);
        }

        Attendance attendance = new Attendance();
        attendance.setUuid(UUID.randomUUID());
        attendance.setShiftAssignmentUuid(assignment.getUuid());
        attendance.setUserUuid(userId);
        attendance.setShiftDefinitionUuid(shift.getUuid());
        attendance.setWorkDate(assignment.getWorkDate());
        attendance.setCheckInAt(now);
        attendance.setAttendanceStatus(AttendanceStatus.IN_PROGRESS);
        attendance.setApprovalStatus(ApprovalStatus.PENDING);
        attendance.setDayType(resolveDayType(assignment.getWorkDate()));
        long late = positiveMinutes(shiftStart, now);
        attendance.setLateMinutes((int) late);
        attendance.setCreatedAt(now);
        attendance.setUpdatedAt(now);
        attendanceRepository.save(attendance);
        return toResponse(attendance, directory.requireUser(userId), shift);
    }

    @Transactional
    public AttendanceResponse checkOut(UUID userId, UUID shiftAssignmentUuid, String verificationCode) {
        Attendance attendance = attendanceRepository.findByShiftAssignmentUuid(shiftAssignmentUuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_NOT_CHECKED_IN));
        if (!attendance.getUserUuid().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (!checkpointCodeService.verify(verificationCode)) {
            throw new AppException(ErrorCode.HR_CHECKPOINT_CODE_INVALID);
        }
        if (attendance.getCheckOutAt() != null) {
            throw new AppException(ErrorCode.HR_ALREADY_CHECKED_OUT);
        }
        ShiftDefinition shift = directory.requireShift(attendance.getShiftDefinitionUuid());
        attendance.setCheckOutAt(AppTimeZones.now());
        recompute(attendance, shift);
        attendance.setUpdatedAt(AppTimeZones.now());
        attendanceRepository.save(attendance);
        return toResponse(attendance, directory.requireUser(userId), shift);
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> listForUser(UUID userId, LocalDate from, LocalDate to) {
        List<Attendance> records = attendanceRepository
                .findByUserUuidAndWorkDateBetweenOrderByWorkDateDescCreatedAtDesc(userId, from, to);
        return buildResponses(records);
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AttendanceResponse> search(LocalDate from, LocalDate to, UUID userId, ApprovalStatus approvalStatus) {
        return buildResponses(attendanceRepository.search(from, to, userId, approvalStatus));
    }

    @Transactional
    public AttendanceResponse update(UUID uuid, AttendanceUpdateRequest request, UUID actorId) {
        Attendance attendance = requireAttendance(uuid);
        // Chấm công đã duyệt là dữ liệu tính lương — khóa, không cho chỉnh sửa.
        if (attendance.getApprovalStatus() == ApprovalStatus.APPROVED) {
            throw new AppException(ErrorCode.HR_ATTENDANCE_LOCKED);
        }
        ShiftDefinition shift = directory.requireShift(attendance.getShiftDefinitionUuid());
        if (request.checkInAt() != null) {
            attendance.setCheckInAt(request.checkInAt());
        }
        if (request.checkOutAt() != null) {
            attendance.setCheckOutAt(request.checkOutAt());
        }
        if (request.note() != null) {
            attendance.setNote(request.note());
        }
        if (attendance.getCheckInAt() != null && attendance.getCheckOutAt() != null) {
            recompute(attendance, shift);
        }
        if (request.otMinutesApproved() != null) {
            attendance.setOtMinutesApproved(Math.max(0, request.otMinutesApproved()));
            attendance.setOtApprovalManual(true);
        }
        attendance.setUpdatedAt(AppTimeZones.now());
        attendanceRepository.save(attendance);
        return toResponse(attendance, directory.requireUser(attendance.getUserUuid()), shift);
    }

    @Transactional
    public AttendanceResponse approve(UUID uuid, UUID actorId) {
        Attendance attendance = requireAttendance(uuid);
        if (attendance.getCheckOutAt() == null) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Chưa check-out nên chưa thể duyệt chấm công");
        }
        // Mặc định duyệt toàn bộ OT đã tính, TRỪ khi admin đã chỉnh tay (kể cả cố ý để 0).
        if (!attendance.isOtApprovalManual()
                && attendance.getOtMinutesApproved() == 0 && attendance.getOtMinutes() > 0) {
            attendance.setOtMinutesApproved(attendance.getOtMinutes());
        }
        attendance.setApprovalStatus(ApprovalStatus.APPROVED);
        attendance.setApprovedBy(actorId);
        attendance.setApprovedAt(AppTimeZones.now());
        attendance.setUpdatedAt(AppTimeZones.now());
        attendanceRepository.save(attendance);
        return toResponse(attendance, directory.requireUser(attendance.getUserUuid()),
                directory.requireShift(attendance.getShiftDefinitionUuid()));
    }

    @Transactional
    public AttendanceResponse reject(UUID uuid, UUID actorId) {
        Attendance attendance = requireAttendance(uuid);
        // Đã duyệt thì khóa — không cho chuyển sang từ chối/thay đổi.
        if (attendance.getApprovalStatus() == ApprovalStatus.APPROVED) {
            throw new AppException(ErrorCode.HR_ATTENDANCE_LOCKED);
        }
        attendance.setApprovalStatus(ApprovalStatus.REJECTED);
        attendance.setOtMinutesApproved(0);
        attendance.setApprovedBy(actorId);
        attendance.setApprovedAt(AppTimeZones.now());
        attendance.setUpdatedAt(AppTimeZones.now());
        attendanceRepository.save(attendance);
        return toResponse(attendance, directory.requireUser(attendance.getUserUuid()),
                directory.requireShift(attendance.getShiftDefinitionUuid()));
    }

    /**
     * Tạo bản ghi VẮNG cho các ca đã qua nhưng nhân viên không check-in.
     * @return số bản ghi được tạo.
     */
    @Transactional
    public int markAbsentForPastAssignments() {
        LocalDate today = AppTimeZones.now().toLocalDate();
        List<ShiftAssignment> past = shiftAssignmentRepository
                .findByWorkDateLessThanAndStatus(today, ShiftAssignmentStatus.SCHEDULED);
        int created = 0;
        OffsetDateTime now = AppTimeZones.now();
        for (ShiftAssignment assignment : past) {
            if (attendanceRepository.existsByShiftAssignmentUuid(assignment.getUuid())) {
                continue;
            }
            Attendance attendance = new Attendance();
            attendance.setUuid(UUID.randomUUID());
            attendance.setShiftAssignmentUuid(assignment.getUuid());
            attendance.setUserUuid(assignment.getUserUuid());
            attendance.setShiftDefinitionUuid(assignment.getShiftDefinitionUuid());
            attendance.setWorkDate(assignment.getWorkDate());
            attendance.setAttendanceStatus(AttendanceStatus.ABSENT);
            attendance.setApprovalStatus(ApprovalStatus.APPROVED);
            attendance.setDayType(resolveDayType(assignment.getWorkDate()));
            attendance.setCreatedAt(now);
            attendance.setUpdatedAt(now);
            attendanceRepository.save(attendance);
            created++;
        }
        return created;
    }

    // ------------------------------------------------------------------
    // Computation
    // ------------------------------------------------------------------

    private void recompute(Attendance attendance, ShiftDefinition shift) {
        OffsetDateTime checkIn = attendance.getCheckInAt();
        OffsetDateTime checkOut = attendance.getCheckOutAt();
        OffsetDateTime shiftStart = shiftStartAt(attendance.getWorkDate(), shift);
        OffsetDateTime shiftEnd = shiftEndAt(attendance.getWorkDate(), shift);

        long worked = positiveMinutes(checkIn, checkOut);
        OffsetDateTime effStart = checkIn.isAfter(shiftStart) ? checkIn : shiftStart;
        OffsetDateTime effEnd = checkOut.isBefore(shiftEnd) ? checkOut : shiftEnd;
        long regular = positiveMinutes(effStart, effEnd);
        long ot = checkOut.isAfter(shiftEnd) ? positiveMinutes(shiftEnd, checkOut) : 0;
        if (ot < OT_MIN_THRESHOLD_MINUTES) {
            ot = 0;
        }
        long late = positiveMinutes(shiftStart, checkIn);
        long early = checkOut.isBefore(shiftEnd) ? positiveMinutes(checkOut, shiftEnd) : 0;

        attendance.setWorkedMinutes((int) worked);
        attendance.setRegularMinutes((int) regular);
        attendance.setOtMinutes((int) ot);
        attendance.setLateMinutes((int) late);
        attendance.setEarlyLeaveMinutes((int) early);
        attendance.setDayType(resolveDayType(attendance.getWorkDate()));

        AttendanceStatus status;
        if (late > LATE_GRACE_MINUTES) {
            status = AttendanceStatus.LATE;
        } else if (early > EARLY_LEAVE_GRACE_MINUTES) {
            status = AttendanceStatus.EARLY_LEAVE;
        } else {
            status = AttendanceStatus.ON_TIME;
        }
        attendance.setAttendanceStatus(status);
    }

    private DayType resolveDayType(LocalDate date) {
        Holiday holiday = holidayRepository.findByHolidayDate(date).orElse(null);
        if (holiday != null) {
            return DayType.HOLIDAY;
        }
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return DayType.WEEKEND;
        }
        return DayType.WEEKDAY;
    }

    private static OffsetDateTime shiftStartAt(LocalDate date, ShiftDefinition shift) {
        return date.atTime(shift.getStartTime()).atZone(AppTimeZones.BUSINESS).toOffsetDateTime();
    }

    private static OffsetDateTime shiftEndAt(LocalDate date, ShiftDefinition shift) {
        // Ca qua đêm (giờ tan <= giờ vào) -> giờ tan rơi vào ngày hôm sau.
        LocalDate endDate = shift.getEndTime().isAfter(shift.getStartTime()) ? date : date.plusDays(1);
        return endDate.atTime(shift.getEndTime()).atZone(AppTimeZones.BUSINESS).toOffsetDateTime();
    }

    private static long positiveMinutes(OffsetDateTime from, OffsetDateTime to) {
        if (from == null || to == null) {
            return 0;
        }
        long minutes = Duration.between(from, to).toMinutes();
        return Math.max(0, minutes);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private ShiftAssignment requireOwnedAssignment(UUID shiftAssignmentUuid, UUID userId) {
        ShiftAssignment assignment = shiftAssignmentRepository.findById(shiftAssignmentUuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_ASSIGNMENT_NOT_FOUND));
        if (!assignment.getUserUuid().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Ca này không thuộc về bạn");
        }
        if (assignment.getStatus() == ShiftAssignmentStatus.CANCELLED) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID, "Ca đã bị hủy");
        }
        return assignment;
    }

    private Attendance requireAttendance(UUID uuid) {
        return attendanceRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_ATTENDANCE_NOT_FOUND));
    }

    private List<AttendanceResponse> buildResponses(List<Attendance> records) {
        if (records.isEmpty()) {
            return List.of();
        }
        Map<UUID, User> users = directory.usersByIds(
                records.stream().map(Attendance::getUserUuid).collect(Collectors.toSet()));
        Map<UUID, ShiftDefinition> shifts = directory.shiftMap();
        return records.stream()
                .map(a -> toResponse(a, users.get(a.getUserUuid()), shifts.get(a.getShiftDefinitionUuid())))
                .toList();
    }

    private AttendanceResponse toResponse(Attendance a, User user, ShiftDefinition shift) {
        return new AttendanceResponse(
                a.getUuid(),
                a.getShiftAssignmentUuid(),
                a.getUserUuid(),
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                a.getShiftDefinitionUuid(),
                shift != null ? shift.getCode() : null,
                shift != null ? shift.getName() : null,
                a.getWorkDate(),
                shift != null ? shift.getStartTime() : null,
                shift != null ? shift.getEndTime() : null,
                a.getCheckInAt(),
                a.getCheckOutAt(),
                a.getWorkedMinutes(),
                a.getRegularMinutes(),
                a.getOtMinutes(),
                a.getOtMinutesApproved(),
                a.getLateMinutes(),
                a.getEarlyLeaveMinutes(),
                a.getAttendanceStatus().name(),
                a.getDayType().name(),
                a.getApprovalStatus().name(),
                a.getApprovedAt(),
                a.getNote());
    }
}
