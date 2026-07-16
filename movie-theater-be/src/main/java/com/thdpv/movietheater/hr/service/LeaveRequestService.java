package com.thdpv.movietheater.hr.service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
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
import com.thdpv.movietheater.hr.dto.request.LeaveRequestCreateRequest;
import com.thdpv.movietheater.hr.dto.response.LeaveRequestResponse;
import com.thdpv.movietheater.hr.entity.LeaveRequest;
import com.thdpv.movietheater.hr.enums.RequestStatus;
import com.thdpv.movietheater.hr.repository.LeaveRequestRepository;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.user.entity.User;

/**
 * Quản lý đơn xin nghỉ phép: nhân viên tạo/hủy, admin duyệt/từ chối.
 */
@Service
public class LeaveRequestService {

    private static final String SELF_SERVICE_URL = "/admin/hr/me";

    private final LeaveRequestRepository leaveRequestRepository;
    private final HrDirectory directory;
    private final UserNotificationService userNotificationService;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
            HrDirectory directory,
            UserNotificationService userNotificationService) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.directory = directory;
        this.userNotificationService = userNotificationService;
    }

    @Transactional
    public LeaveRequestResponse create(UUID userId, LeaveRequestCreateRequest request) {
        if (request.toDate().isBefore(request.fromDate())) {
            throw new AppException(ErrorCode.HR_LEAVE_RANGE_INVALID, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }
        if (request.fromDate().isBefore(AppTimeZones.now().toLocalDate())) {
            throw new AppException(ErrorCode.HR_LEAVE_PAST_DATE);
        }
        // Chặn chồng lấn với đơn đang chờ hoặc đã duyệt của chính nhân viên.
        boolean overlaps = leaveRequestRepository
                .findOverlapping(RequestStatus.PENDING, Set.of(userId), request.fromDate(), request.toDate())
                .size() > 0
                || leaveRequestRepository
                        .findOverlapping(RequestStatus.APPROVED, Set.of(userId), request.fromDate(), request.toDate())
                        .size() > 0;
        if (overlaps) {
            throw new AppException(ErrorCode.HR_LEAVE_OVERLAP);
        }
        OffsetDateTime now = AppTimeZones.now();
        LeaveRequest entity = new LeaveRequest();
        entity.setUuid(UUID.randomUUID());
        entity.setUserUuid(userId);
        entity.setLeaveType(request.leaveType());
        entity.setFromDate(request.fromDate());
        entity.setToDate(request.toDate());
        entity.setReason(request.reason());
        entity.setStatus(RequestStatus.PENDING);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        leaveRequestRepository.save(entity);
        return toResponse(entity, directory.requireUser(userId));
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> listMine(UUID userId) {
        return buildResponses(leaveRequestRepository.findByUserUuidOrderByCreatedAtDesc(userId));
    }

    @Transactional
    public LeaveRequestResponse cancelMine(UUID userId, UUID uuid) {
        LeaveRequest entity = require(uuid);
        if (!entity.getUserUuid().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Đơn này không thuộc về bạn");
        }
        if (entity.getStatus() != RequestStatus.PENDING) {
            throw new AppException(ErrorCode.HR_LEAVE_STATE_INVALID, "Chỉ hủy được đơn đang chờ duyệt");
        }
        entity.setStatus(RequestStatus.CANCELLED);
        entity.setUpdatedAt(AppTimeZones.now());
        leaveRequestRepository.save(entity);
        return toResponse(entity, directory.requireUser(userId));
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> search(RequestStatus status, UUID userId) {
        return buildResponses(leaveRequestRepository.search(status, userId));
    }

    @Transactional
    public LeaveRequestResponse approve(UUID uuid, UUID actorId, String note) {
        LeaveRequest entity = requirePending(uuid);
        entity.setStatus(RequestStatus.APPROVED);
        finishReview(entity, actorId, note);
        notify(entity, "Đơn nghỉ phép được duyệt",
                "Đơn nghỉ " + entity.getFromDate() + " → " + entity.getToDate() + " đã được duyệt.");
        return toResponse(entity, directory.requireUser(entity.getUserUuid()));
    }

    @Transactional
    public LeaveRequestResponse reject(UUID uuid, UUID actorId, String note) {
        LeaveRequest entity = requirePending(uuid);
        entity.setStatus(RequestStatus.REJECTED);
        finishReview(entity, actorId, note);
        notify(entity, "Đơn nghỉ phép bị từ chối",
                "Đơn nghỉ " + entity.getFromDate() + " → " + entity.getToDate() + " đã bị từ chối."
                        + (note != null && !note.isBlank() ? " Lý do: " + note : ""));
        return toResponse(entity, directory.requireUser(entity.getUserUuid()));
    }

    private void finishReview(LeaveRequest entity, UUID actorId, String note) {
        entity.setReviewedBy(actorId);
        entity.setReviewedAt(AppTimeZones.now());
        entity.setReviewNote(note);
        entity.setUpdatedAt(AppTimeZones.now());
        leaveRequestRepository.save(entity);
    }

    private void notify(LeaveRequest entity, String title, String content) {
        try {
            userNotificationService.createSystemNotification(
                    entity.getUserUuid(), title, content, "leave_request", SELF_SERVICE_URL);
        } catch (Exception ignored) {
            // Không để lỗi thông báo ảnh hưởng luồng duyệt.
        }
    }

    private LeaveRequest require(UUID uuid) {
        return leaveRequestRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_LEAVE_NOT_FOUND));
    }

    private LeaveRequest requirePending(UUID uuid) {
        LeaveRequest entity = require(uuid);
        if (entity.getStatus() != RequestStatus.PENDING) {
            throw new AppException(ErrorCode.HR_LEAVE_STATE_INVALID, "Đơn đã được xử lý trước đó");
        }
        return entity;
    }

    private List<LeaveRequestResponse> buildResponses(List<LeaveRequest> list) {
        if (list.isEmpty()) {
            return List.of();
        }
        Map<UUID, User> users = directory.usersByIds(
                list.stream().map(LeaveRequest::getUserUuid).collect(Collectors.toSet()));
        return list.stream().map(l -> toResponse(l, users.get(l.getUserUuid()))).toList();
    }

    private LeaveRequestResponse toResponse(LeaveRequest l, User user) {
        long days = ChronoUnit.DAYS.between(l.getFromDate(), l.getToDate()) + 1;
        return new LeaveRequestResponse(
                l.getUuid(),
                l.getUserUuid(),
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                l.getLeaveType().name(),
                l.getFromDate(),
                l.getToDate(),
                days,
                l.getReason(),
                l.getStatus().name(),
                l.getReviewNote(),
                l.getReviewedAt(),
                l.getCreatedAt());
    }
}
