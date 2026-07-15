package com.thdpv.movietheater.hr.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
import com.thdpv.movietheater.hr.dto.request.ShiftAssignmentBulkRequest;
import com.thdpv.movietheater.hr.dto.request.ShiftAssignmentCreateRequest;
import com.thdpv.movietheater.hr.dto.response.ShiftAssignmentResponse;
import com.thdpv.movietheater.hr.entity.Attendance;
import com.thdpv.movietheater.hr.entity.ShiftAssignment;
import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.enums.ShiftAssignmentStatus;
import com.thdpv.movietheater.hr.entity.LeaveRequest;
import com.thdpv.movietheater.hr.enums.RequestStatus;
import com.thdpv.movietheater.hr.repository.AttendanceRepository;
import com.thdpv.movietheater.hr.repository.LeaveRequestRepository;
import com.thdpv.movietheater.hr.repository.ShiftAssignmentRepository;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.user.entity.User;

@Service
public class ShiftAssignmentService {

    /** Nghỉ tối thiểu qua đêm giữa ca kết thúc muộn và ca của ngày kế tiếp. */
    private static final long MIN_REST_MINUTES = 8 * 60;
    /** Trần giờ làm tối đa trong một ngày (chặn cứng). */
    private static final long MAX_DAILY_MINUTES = 12 * 60;
    /** Deep link tới màn tự phục vụ của nhân viên. */
    private static final String SELF_SERVICE_URL = "/admin/hr/me";
    /** Nhắc ca khi còn tối đa số phút này trước giờ vào. */
    private static final long REMINDER_LEAD_MINUTES = 120;

    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final HrDirectory directory;
    private final UserNotificationService userNotificationService;
    private final LeaveRequestRepository leaveRequestRepository;

    public ShiftAssignmentService(ShiftAssignmentRepository shiftAssignmentRepository,
            AttendanceRepository attendanceRepository,
            HrDirectory directory,
            UserNotificationService userNotificationService,
            LeaveRequestRepository leaveRequestRepository) {
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.directory = directory;
        this.userNotificationService = userNotificationService;
        this.leaveRequestRepository = leaveRequestRepository;
    }

    @Transactional
    public ShiftAssignmentResponse assign(ShiftAssignmentCreateRequest request, UUID actorId) {
        directory.requireUser(request.userId());
        ShiftDefinition shift = directory.requireShift(request.shiftDefinitionUuid());
        if (request.workDate().isBefore(AppTimeZones.now().toLocalDate())) {
            throw new AppException(ErrorCode.HR_ASSIGNMENT_PAST_DATE);
        }
        if (shiftAssignmentRepository.existsByUserUuidAndWorkDateAndShiftDefinitionUuid(
                request.userId(), request.workDate(), request.shiftDefinitionUuid())) {
            throw new AppException(ErrorCode.HR_ASSIGNMENT_CONFLICT);
        }
        if (isOnApprovedLeave(request.userId(), request.workDate())) {
            throw new AppException(ErrorCode.HR_LEAVE_OVERLAP,
                    "Nhân viên đang có đơn nghỉ phép đã duyệt trong ngày này");
        }
        List<Interval> existing = loadIntervals(
                request.userId(), request.workDate().minusDays(1), request.workDate().plusDays(1));
        ErrorCode violation = scheduleViolation(existing, intervalOf(request.workDate(), shift));
        if (violation != null) {
            throw new AppException(violation);
        }
        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setUuid(UUID.randomUUID());
        assignment.setUserUuid(request.userId());
        assignment.setShiftDefinitionUuid(request.shiftDefinitionUuid());
        assignment.setWorkDate(request.workDate());
        assignment.setStatus(ShiftAssignmentStatus.SCHEDULED);
        assignment.setNote(request.note());
        assignment.setCreatedAt(AppTimeZones.now());
        assignment.setUpdatedAt(AppTimeZones.now());
        assignment.setCreatedBy(actorId);
        shiftAssignmentRepository.save(assignment);
        notifyAssigned(List.of(assignment));
        return buildResponses(List.of(assignment)).get(0);
    }

    @Transactional
    public List<ShiftAssignmentResponse> assignBulk(ShiftAssignmentBulkRequest request, UUID actorId) {
        LocalDate today = AppTimeZones.now().toLocalDate();
        Map<UUID, ShiftDefinition> shiftMap = directory.shiftMap();
        for (UUID shiftUuid : request.shiftDefinitionUuids()) {
            if (!shiftMap.containsKey(shiftUuid)) {
                directory.requireShift(shiftUuid); // ném HR_SHIFT_NOT_FOUND
            }
        }

        LocalDate minDate = request.workDates().stream().min(LocalDate::compareTo).orElse(today);
        LocalDate maxDate = request.workDates().stream().max(LocalDate::compareTo).orElse(today);

        // Nạp sẵn lịch hiện có (±1 ngày để kiểm tra nghỉ qua đêm) cho toàn bộ nhân viên.
        Map<UUID, List<Interval>> userIntervals = new HashMap<>();
        Set<String> takenKeys = new HashSet<>();
        for (ShiftAssignment a : shiftAssignmentRepository.findByUserUuidInAndWorkDateBetween(
                request.userIds(), minDate.minusDays(1), maxDate.plusDays(1))) {
            ShiftDefinition sd = shiftMap.get(a.getShiftDefinitionUuid());
            if (sd != null) {
                userIntervals.computeIfAbsent(a.getUserUuid(), k -> new ArrayList<>())
                        .add(intervalOf(a.getWorkDate(), sd));
            }
            takenKeys.add(comboKey(a.getUserUuid(), a.getWorkDate(), a.getShiftDefinitionUuid()));
        }

        // Nạp sẵn ngày nghỉ phép đã duyệt của các nhân viên để bỏ qua khi xếp ca.
        Map<UUID, Set<LocalDate>> leaveDays = approvedLeaveDays(request.userIds(), minDate, maxDate);

        List<ShiftAssignment> created = new ArrayList<>();
        for (UUID userId : request.userIds()) {
            directory.requireUser(userId);
            List<Interval> intervals = userIntervals.computeIfAbsent(userId, k -> new ArrayList<>());
            Set<LocalDate> userLeave = leaveDays.getOrDefault(userId, Set.of());
            for (UUID shiftUuid : request.shiftDefinitionUuids()) {
                ShiftDefinition sd = shiftMap.get(shiftUuid);
                for (LocalDate date : request.workDates()) {
                    if (date.isBefore(today)) {
                        continue;
                    }
                    if (userLeave.contains(date)) {
                        continue; // đang nghỉ phép -> bỏ qua
                    }
                    if (takenKeys.contains(comboKey(userId, date, shiftUuid))) {
                        continue; // trùng ca đã có
                    }
                    Interval candidate = intervalOf(date, sd);
                    if (scheduleViolation(intervals, candidate) != null) {
                        continue; // chồng giờ / thiếu nghỉ / vượt giờ ngày -> bỏ qua
                    }
                    ShiftAssignment assignment = new ShiftAssignment();
                    assignment.setUuid(UUID.randomUUID());
                    assignment.setUserUuid(userId);
                    assignment.setShiftDefinitionUuid(shiftUuid);
                    assignment.setWorkDate(date);
                    assignment.setStatus(ShiftAssignmentStatus.SCHEDULED);
                    assignment.setNote(request.note());
                    assignment.setCreatedAt(AppTimeZones.now());
                    assignment.setUpdatedAt(AppTimeZones.now());
                    assignment.setCreatedBy(actorId);
                    created.add(assignment);
                    intervals.add(candidate);
                    takenKeys.add(comboKey(userId, date, shiftUuid));
                }
            }
        }
        shiftAssignmentRepository.saveAll(created);
        notifyAssigned(created);
        return buildResponses(created);
    }

    /**
     * Nhân bản lịch của tuần nguồn sang tuần đích (giữ nguyên thứ trong tuần).
     * Bỏ qua ngày đã qua, ca trùng và ca xung đột lịch.
     */
    @Transactional
    public List<ShiftAssignmentResponse> copyWeek(LocalDate sourceWeekStart, LocalDate targetWeekStart, UUID actorId) {
        LocalDate today = AppTimeZones.now().toLocalDate();
        long offsetDays = ChronoUnit.DAYS.between(sourceWeekStart, targetWeekStart);
        List<ShiftAssignment> source = shiftAssignmentRepository
                .findByWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(sourceWeekStart, sourceWeekStart.plusDays(6));
        if (source.isEmpty()) {
            return List.of();
        }
        Map<UUID, ShiftDefinition> shiftMap = directory.shiftMap();
        Set<UUID> userIds = source.stream().map(ShiftAssignment::getUserUuid).collect(Collectors.toSet());
        LocalDate targetEnd = targetWeekStart.plusDays(6);

        Map<UUID, List<Interval>> userIntervals = new HashMap<>();
        Set<String> takenKeys = new HashSet<>();
        for (ShiftAssignment a : shiftAssignmentRepository.findByUserUuidInAndWorkDateBetween(
                userIds, targetWeekStart.minusDays(1), targetEnd.plusDays(1))) {
            ShiftDefinition sd = shiftMap.get(a.getShiftDefinitionUuid());
            if (sd != null) {
                userIntervals.computeIfAbsent(a.getUserUuid(), k -> new ArrayList<>())
                        .add(intervalOf(a.getWorkDate(), sd));
            }
            takenKeys.add(comboKey(a.getUserUuid(), a.getWorkDate(), a.getShiftDefinitionUuid()));
        }

        Map<UUID, Set<LocalDate>> leaveDays = approvedLeaveDays(userIds, targetWeekStart, targetEnd);

        OffsetDateTime now = AppTimeZones.now();
        List<ShiftAssignment> created = new ArrayList<>();
        for (ShiftAssignment src : source) {
            LocalDate targetDate = src.getWorkDate().plusDays(offsetDays);
            if (targetDate.isBefore(today)) {
                continue;
            }
            if (leaveDays.getOrDefault(src.getUserUuid(), Set.of()).contains(targetDate)) {
                continue; // đang nghỉ phép -> bỏ qua
            }
            ShiftDefinition sd = shiftMap.get(src.getShiftDefinitionUuid());
            if (sd == null) {
                continue;
            }
            String key = comboKey(src.getUserUuid(), targetDate, src.getShiftDefinitionUuid());
            if (takenKeys.contains(key)) {
                continue;
            }
            Interval candidate = intervalOf(targetDate, sd);
            List<Interval> intervals = userIntervals.computeIfAbsent(src.getUserUuid(), k -> new ArrayList<>());
            if (scheduleViolation(intervals, candidate) != null) {
                continue;
            }
            ShiftAssignment assignment = new ShiftAssignment();
            assignment.setUuid(UUID.randomUUID());
            assignment.setUserUuid(src.getUserUuid());
            assignment.setShiftDefinitionUuid(src.getShiftDefinitionUuid());
            assignment.setWorkDate(targetDate);
            assignment.setStatus(ShiftAssignmentStatus.SCHEDULED);
            assignment.setNote(src.getNote());
            assignment.setCreatedAt(now);
            assignment.setUpdatedAt(now);
            assignment.setCreatedBy(actorId);
            created.add(assignment);
            intervals.add(candidate);
            takenKeys.add(key);
        }
        shiftAssignmentRepository.saveAll(created);
        notifyAssigned(created);
        return buildResponses(created);
    }

    /**
     * Gửi nhắc "ca sắp tới" cho các ca hôm nay bắt đầu trong {@value #REMINDER_LEAD_MINUTES} phút tới.
     * @return số nhắc đã gửi.
     */
    @Transactional
    public int sendUpcomingShiftReminders() {
        OffsetDateTime now = AppTimeZones.now();
        List<ShiftAssignment> candidates = shiftAssignmentRepository
                .findByWorkDateAndStatusAndReminderSentAtIsNull(now.toLocalDate(), ShiftAssignmentStatus.SCHEDULED);
        if (candidates.isEmpty()) {
            return 0;
        }
        Map<UUID, ShiftDefinition> shiftMap = directory.shiftMap();
        int sent = 0;
        List<ShiftAssignment> touched = new ArrayList<>();
        for (ShiftAssignment a : candidates) {
            ShiftDefinition sd = shiftMap.get(a.getShiftDefinitionUuid());
            if (sd == null) {
                continue;
            }
            OffsetDateTime start = a.getWorkDate().atTime(sd.getStartTime())
                    .atZone(AppTimeZones.BUSINESS).toOffsetDateTime();
            long minutesToStart = Duration.between(now, start).toMinutes();
            if (minutesToStart > REMINDER_LEAD_MINUTES) {
                continue; // chưa tới lúc nhắc, để lần quét sau
            }
            if (minutesToStart >= 0) {
                try {
                    userNotificationService.createSystemNotification(a.getUserUuid(), "Sắp tới ca làm",
                            "Ca " + sd.getName() + " bắt đầu lúc " + sd.getStartTime() + " hôm nay.",
                            "shift_reminder", SELF_SERVICE_URL);
                    sent++;
                } catch (Exception ignored) {
                    // Bỏ qua lỗi thông báo.
                }
            }
            // Dù đã quá giờ hay vừa nhắc -> đánh dấu để không xử lý lại.
            a.setReminderSentAt(now);
            a.setUpdatedAt(now);
            touched.add(a);
        }
        shiftAssignmentRepository.saveAll(touched);
        return sent;
    }

    /** Gửi thông báo in-app "được xếp ca" — gộp một thông báo/nhân viên. */
    private void notifyAssigned(List<ShiftAssignment> created) {
        if (created == null || created.isEmpty()) {
            return;
        }
        Map<UUID, List<ShiftAssignment>> byUser = created.stream()
                .collect(Collectors.groupingBy(ShiftAssignment::getUserUuid));
        byUser.forEach((userId, list) -> {
            LocalDate min = list.stream().map(ShiftAssignment::getWorkDate).min(LocalDate::compareTo).orElse(null);
            LocalDate max = list.stream().map(ShiftAssignment::getWorkDate).max(LocalDate::compareTo).orElse(null);
            String range = (min != null && min.equals(max)) ? String.valueOf(min) : (min + " → " + max);
            String content = "Bạn được xếp " + list.size() + " ca làm việc (" + range + "). Xem chi tiết trong lịch của bạn.";
            try {
                userNotificationService.createSystemNotification(
                        userId, "Bạn có ca làm mới", content, "shift_assigned", SELF_SERVICE_URL);
            } catch (Exception ignored) {
                // Thông báo lỗi không được làm hỏng luồng xếp ca.
            }
        });
    }

    private static String comboKey(UUID userId, LocalDate date, UUID shiftUuid) {
        return userId + "|" + date + "|" + shiftUuid;
    }

    // ------------------------------------------------------------------
    // Nghỉ phép & đổi ca
    // ------------------------------------------------------------------

    private boolean isOnApprovedLeave(UUID userId, LocalDate date) {
        return leaveRequestRepository
                .existsByUserUuidAndStatusAndFromDateLessThanEqualAndToDateGreaterThanEqual(
                        userId, RequestStatus.APPROVED, date, date);
    }

    /** Tập ngày nghỉ phép đã duyệt của từng nhân viên trong khoảng [from, to]. */
    private Map<UUID, Set<LocalDate>> approvedLeaveDays(Collection<UUID> userIds, LocalDate from, LocalDate to) {
        Map<UUID, Set<LocalDate>> map = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return map;
        }
        for (LeaveRequest lr : leaveRequestRepository.findOverlapping(RequestStatus.APPROVED, userIds, from, to)) {
            Set<LocalDate> days = map.computeIfAbsent(lr.getUserUuid(), k -> new HashSet<>());
            LocalDate d = lr.getFromDate().isBefore(from) ? from : lr.getFromDate();
            LocalDate end = lr.getToDate().isAfter(to) ? to : lr.getToDate();
            while (!d.isAfter(end)) {
                days.add(d);
                d = d.plusDays(1);
            }
        }
        return map;
    }

    /**
     * Kiểm tra nhân viên có thể nhận ca (date, shift) không (chống xung đột + nghỉ phép),
     * bỏ qua các phân ca thuộc {@code excludeUuids}. Trả về ErrorCode vi phạm hoặc null nếu hợp lệ.
     */
    public ErrorCode assignabilityViolation(UUID userId, LocalDate date, ShiftDefinition shift, Set<UUID> excludeUuids) {
        if (isOnApprovedLeave(userId, date)) {
            return ErrorCode.HR_LEAVE_OVERLAP;
        }
        Map<UUID, ShiftDefinition> shiftMap = directory.shiftMap();
        List<Interval> existing = new ArrayList<>();
        for (ShiftAssignment a : shiftAssignmentRepository
                .findByUserUuidAndWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(
                        userId, date.minusDays(1), date.plusDays(1))) {
            if (excludeUuids != null && excludeUuids.contains(a.getUuid())) {
                continue;
            }
            ShiftDefinition sd = shiftMap.get(a.getShiftDefinitionUuid());
            if (sd != null) {
                existing.add(intervalOf(a.getWorkDate(), sd));
            }
        }
        return scheduleViolation(existing, intervalOf(date, shift));
    }

    /** Danh sách ca sắp tới của đồng nghiệp (khác {@code excludeUserId}) để chọn đối tác đổi ca. */
    @Transactional(readOnly = true)
    public List<ShiftAssignmentResponse> listSwapCandidates(UUID excludeUserId, LocalDate from, LocalDate to) {
        LocalDate today = AppTimeZones.now().toLocalDate();
        LocalDate effFrom = from.isBefore(today) ? today : from;
        List<ShiftAssignment> candidates = shiftAssignmentRepository
                .findByWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(effFrom, to).stream()
                .filter(a -> !a.getUserUuid().equals(excludeUserId))
                .filter(a -> a.getStatus() == ShiftAssignmentStatus.SCHEDULED)
                .toList();
        return buildResponses(candidates);
    }

    /**
     * Áp dụng đổi ca: hoán đổi chủ sở hữu giữa {@code a} (của người yêu cầu) và {@code b} (của đồng nghiệp).
     * Có kiểm tra xung đột lịch & nghỉ phép cho cả hai phía. Ném AppException nếu không hợp lệ.
     */
    @Transactional
    public void applySwap(ShiftAssignment a, ShiftAssignment b, UUID actorId) {
        UUID userA = a.getUserUuid();
        UUID userB = b.getUserUuid();
        Map<UUID, ShiftDefinition> shiftMap = directory.shiftMap();
        ShiftDefinition sa = shiftMap.get(a.getShiftDefinitionUuid());
        ShiftDefinition sb = shiftMap.get(b.getShiftDefinitionUuid());
        if (sa == null || sb == null) {
            throw new AppException(ErrorCode.HR_SHIFT_NOT_FOUND);
        }
        Set<UUID> exclude = Set.of(a.getUuid(), b.getUuid());
        ErrorCode v1 = assignabilityViolation(userA, b.getWorkDate(), sb, exclude);
        if (v1 != null) {
            throw new AppException(v1, "Người yêu cầu bị xung đột lịch hoặc nghỉ phép với ca nhận");
        }
        ErrorCode v2 = assignabilityViolation(userB, a.getWorkDate(), sa, exclude);
        if (v2 != null) {
            throw new AppException(v2, "Đồng nghiệp bị xung đột lịch hoặc nghỉ phép với ca nhận");
        }
        OffsetDateTime now = AppTimeZones.now();
        a.setUserUuid(userB);
        a.setReminderSentAt(null);
        a.setUpdatedAt(now);
        b.setUserUuid(userA);
        b.setReminderSentAt(null);
        b.setUpdatedAt(now);
        shiftAssignmentRepository.saveAll(List.of(a, b));
    }

    private List<Interval> loadIntervals(UUID userId, LocalDate from, LocalDate to) {
        Map<UUID, ShiftDefinition> shiftMap = directory.shiftMap();
        List<Interval> result = new ArrayList<>();
        for (ShiftAssignment a : shiftAssignmentRepository
                .findByUserUuidAndWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(userId, from, to)) {
            ShiftDefinition sd = shiftMap.get(a.getShiftDefinitionUuid());
            if (sd != null) {
                result.add(intervalOf(a.getWorkDate(), sd));
            }
        }
        return result;
    }

    /** Khoảng thời gian thực tế của một ca (xử lý ca qua đêm: giờ tan &lt;= giờ vào -&gt; sang ngày hôm sau). */
    private record Interval(LocalDate workDate, LocalDateTime start, LocalDateTime end) {
        long durationMinutes() {
            return Duration.between(start, end).toMinutes();
        }
    }

    private static Interval intervalOf(LocalDate date, ShiftDefinition shift) {
        LocalTime st = shift.getStartTime() != null ? shift.getStartTime() : LocalTime.MIDNIGHT;
        LocalTime et = shift.getEndTime() != null ? shift.getEndTime() : LocalTime.MIDNIGHT;
        LocalDateTime start = date.atTime(st);
        LocalDateTime end = et.isAfter(st) ? date.atTime(et) : date.plusDays(1).atTime(et);
        return new Interval(date, start, end);
    }

    /**
     * Kiểm tra thêm {@code candidate} vào tập ca {@code existing} của một nhân viên có vi phạm không.
     * Trả về ErrorCode vi phạm đầu tiên, hoặc null nếu hợp lệ.
     */
    private static ErrorCode scheduleViolation(List<Interval> existing, Interval candidate) {
        long sameDayMinutes = candidate.durationMinutes();
        for (Interval iv : existing) {
            // 1) Chồng giờ
            if (candidate.start().isBefore(iv.end()) && iv.start().isBefore(candidate.end())) {
                return ErrorCode.HR_ASSIGNMENT_OVERLAP;
            }
            if (iv.workDate().equals(candidate.workDate())) {
                // 2) Tổng giờ trong ngày
                sameDayMinutes += iv.durationMinutes();
            } else {
                // 3) Nghỉ tối thiểu giữa hai ca khác ngày
                LocalDateTime earlierEnd;
                LocalDateTime laterStart;
                if (!iv.start().isAfter(candidate.start())) {
                    earlierEnd = iv.end();
                    laterStart = candidate.start();
                } else {
                    earlierEnd = candidate.end();
                    laterStart = iv.start();
                }
                if (laterStart.isAfter(earlierEnd)
                        && Duration.between(earlierEnd, laterStart).toMinutes() < MIN_REST_MINUTES) {
                    return ErrorCode.HR_ASSIGNMENT_REST;
                }
            }
        }
        if (sameDayMinutes > MAX_DAILY_MINUTES) {
            return ErrorCode.HR_ASSIGNMENT_DAILY_LIMIT;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public List<ShiftAssignmentResponse> list(LocalDate from, LocalDate to, UUID userId) {
        List<ShiftAssignment> assignments = userId != null
                ? shiftAssignmentRepository.findByUserUuidAndWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(userId, from, to)
                : shiftAssignmentRepository.findByWorkDateBetweenOrderByWorkDateAscCreatedAtAsc(from, to);
        return buildResponses(assignments);
    }

    @Transactional
    public void delete(UUID uuid) {
        ShiftAssignment assignment = shiftAssignmentRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_ASSIGNMENT_NOT_FOUND));
        // Chỉ cho xóa ca chưa bắt đầu (ca sắp tới). Ca đang diễn ra hoặc đã qua thì khóa.
        ShiftDefinition shift = directory.requireShift(assignment.getShiftDefinitionUuid());
        LocalTime startTime = shift.getStartTime() != null ? shift.getStartTime() : LocalTime.MIDNIGHT;
        LocalDateTime shiftStart = assignment.getWorkDate().atTime(startTime);
        if (!AppTimeZones.now().toLocalDateTime().isBefore(shiftStart)) {
            throw new AppException(ErrorCode.HR_ASSIGNMENT_LOCKED);
        }
        if (attendanceRepository.existsByShiftAssignmentUuid(uuid)) {
            throw new AppException(ErrorCode.HR_PAYROLL_STATE_INVALID,
                    "Không thể xóa ca đã có dữ liệu chấm công");
        }
        shiftAssignmentRepository.delete(assignment);
    }

    private List<ShiftAssignmentResponse> buildResponses(List<ShiftAssignment> assignments) {
        if (assignments.isEmpty()) {
            return List.of();
        }
        Map<UUID, User> users = directory.usersByIds(
                assignments.stream().map(ShiftAssignment::getUserUuid).collect(Collectors.toSet()));
        Map<UUID, ShiftDefinition> shifts = directory.shiftMap();
        Map<UUID, Attendance> attendanceByAssignment = new LinkedHashMap<>();
        List<UUID> assignmentIds = assignments.stream().map(ShiftAssignment::getUuid).toList();
        for (Attendance attendance : attendanceRepository.findByShiftAssignmentUuidIn(assignmentIds)) {
            attendanceByAssignment.put(attendance.getShiftAssignmentUuid(), attendance);
        }
        return assignments.stream()
                .map(a -> toResponse(a, users.get(a.getUserUuid()), shifts.get(a.getShiftDefinitionUuid()),
                        attendanceByAssignment.get(a.getUuid())))
                .toList();
    }

    private ShiftAssignmentResponse toResponse(ShiftAssignment a, User user, ShiftDefinition shift, Attendance att) {
        return new ShiftAssignmentResponse(
                a.getUuid(),
                a.getUserUuid(),
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                a.getShiftDefinitionUuid(),
                shift != null ? shift.getCode() : null,
                shift != null ? shift.getName() : null,
                shift != null ? shift.getStartTime() : null,
                shift != null ? shift.getEndTime() : null,
                a.getWorkDate(),
                a.getStatus().name(),
                a.getNote(),
                att != null ? att.getUuid() : null,
                att != null ? att.getAttendanceStatus().name() : null,
                att != null ? att.getApprovalStatus().name() : null,
                att != null ? att.getCheckInAt() : null,
                att != null ? att.getCheckOutAt() : null);
    }
}
