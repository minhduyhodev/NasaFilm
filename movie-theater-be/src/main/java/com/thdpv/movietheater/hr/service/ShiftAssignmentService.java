package com.thdpv.movietheater.hr.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
import com.thdpv.movietheater.hr.repository.AttendanceRepository;
import com.thdpv.movietheater.hr.repository.ShiftAssignmentRepository;
import com.thdpv.movietheater.user.entity.User;

@Service
public class ShiftAssignmentService {

    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final HrDirectory directory;

    public ShiftAssignmentService(ShiftAssignmentRepository shiftAssignmentRepository,
            AttendanceRepository attendanceRepository,
            HrDirectory directory) {
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.directory = directory;
    }

    @Transactional
    public ShiftAssignmentResponse assign(ShiftAssignmentCreateRequest request, UUID actorId) {
        directory.requireUser(request.userId());
        directory.requireShift(request.shiftDefinitionUuid());
        if (request.workDate().isBefore(AppTimeZones.now().toLocalDate())) {
            throw new AppException(ErrorCode.HR_ASSIGNMENT_PAST_DATE);
        }
        if (shiftAssignmentRepository.existsByUserUuidAndWorkDateAndShiftDefinitionUuid(
                request.userId(), request.workDate(), request.shiftDefinitionUuid())) {
            throw new AppException(ErrorCode.HR_ASSIGNMENT_CONFLICT);
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
        return buildResponses(List.of(assignment)).get(0);
    }

    @Transactional
    public List<ShiftAssignmentResponse> assignBulk(ShiftAssignmentBulkRequest request, UUID actorId) {
        LocalDate today = AppTimeZones.now().toLocalDate();
        List<ShiftAssignment> created = new ArrayList<>();
        for (UUID userId : request.userIds()) {
            directory.requireUser(userId);
            for (UUID shiftUuid : request.shiftDefinitionUuids()) {
                directory.requireShift(shiftUuid);
                for (LocalDate date : request.workDates()) {
                    if (date.isBefore(today)) {
                        continue;
                    }
                    if (shiftAssignmentRepository.existsByUserUuidAndWorkDateAndShiftDefinitionUuid(
                            userId, date, shiftUuid)) {
                        continue;
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
                }
            }
        }
        shiftAssignmentRepository.saveAll(created);
        return buildResponses(created);
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
