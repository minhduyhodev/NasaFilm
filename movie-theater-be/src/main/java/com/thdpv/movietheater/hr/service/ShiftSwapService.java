package com.thdpv.movietheater.hr.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
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
import com.thdpv.movietheater.hr.dto.request.SwapCreateRequest;
import com.thdpv.movietheater.hr.dto.response.ShiftSwapRequestResponse;
import com.thdpv.movietheater.hr.entity.ShiftAssignment;
import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.entity.ShiftSwapRequest;
import com.thdpv.movietheater.hr.enums.RequestStatus;
import com.thdpv.movietheater.hr.enums.ShiftAssignmentStatus;
import com.thdpv.movietheater.hr.repository.ShiftAssignmentRepository;
import com.thdpv.movietheater.hr.repository.ShiftSwapRequestRepository;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.user.entity.User;

/**
 * Quản lý đơn đổi ca: nhân viên gửi, admin duyệt (hoán đổi chủ ca có kiểm tra xung đột).
 */
@Service
public class ShiftSwapService {

    private static final String SELF_SERVICE_URL = "/admin/hr/me";

    private final ShiftSwapRequestRepository swapRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final ShiftAssignmentService shiftAssignmentService;
    private final HrDirectory directory;
    private final UserNotificationService userNotificationService;

    public ShiftSwapService(ShiftSwapRequestRepository swapRepository,
            ShiftAssignmentRepository assignmentRepository,
            ShiftAssignmentService shiftAssignmentService,
            HrDirectory directory,
            UserNotificationService userNotificationService) {
        this.swapRepository = swapRepository;
        this.assignmentRepository = assignmentRepository;
        this.shiftAssignmentService = shiftAssignmentService;
        this.directory = directory;
        this.userNotificationService = userNotificationService;
    }

    @Transactional
    public ShiftSwapRequestResponse create(UUID userId, SwapCreateRequest request) {
        ShiftAssignment mine = requireFuture(request.requesterAssignmentUuid());
        ShiftAssignment theirs = requireFuture(request.counterpartAssignmentUuid());
        if (!mine.getUserUuid().equals(userId)) {
            throw new AppException(ErrorCode.HR_SWAP_INVALID, "Ca đề nghị đổi không thuộc về bạn");
        }
        if (theirs.getUserUuid().equals(userId)) {
            throw new AppException(ErrorCode.HR_SWAP_INVALID, "Không thể đổi ca với chính mình");
        }
        if (swapRepository.existsByRequesterAssignmentUuidAndStatus(mine.getUuid(), RequestStatus.PENDING)
                || swapRepository.existsByCounterpartAssignmentUuidAndStatus(mine.getUuid(), RequestStatus.PENDING)
                || swapRepository.existsByRequesterAssignmentUuidAndStatus(theirs.getUuid(), RequestStatus.PENDING)
                || swapRepository.existsByCounterpartAssignmentUuidAndStatus(theirs.getUuid(), RequestStatus.PENDING)) {
            throw new AppException(ErrorCode.HR_SWAP_STATE_INVALID, "Một trong hai ca đã có đơn đổi đang chờ duyệt");
        }
        OffsetDateTime now = AppTimeZones.now();
        ShiftSwapRequest entity = new ShiftSwapRequest();
        entity.setUuid(UUID.randomUUID());
        entity.setRequesterUuid(userId);
        entity.setRequesterAssignmentUuid(mine.getUuid());
        entity.setCounterpartUuid(theirs.getUserUuid());
        entity.setCounterpartAssignmentUuid(theirs.getUuid());
        entity.setNote(request.note());
        entity.setStatus(RequestStatus.PENDING);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        swapRepository.save(entity);

        User requester = directory.requireUser(userId);
        pushNotify(theirs.getUserUuid(), "Yêu cầu đổi ca",
                (requester != null ? requester.getFullName() : "Đồng nghiệp")
                        + " muốn đổi ca với bạn. Chờ quản lý duyệt.");
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<ShiftSwapRequestResponse> listMine(UUID userId) {
        return buildResponses(swapRepository.findMine(userId));
    }

    @Transactional
    public ShiftSwapRequestResponse cancelMine(UUID userId, UUID uuid) {
        ShiftSwapRequest entity = require(uuid);
        if (!entity.getRequesterUuid().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Đơn này không thuộc về bạn");
        }
        if (entity.getStatus() != RequestStatus.PENDING) {
            throw new AppException(ErrorCode.HR_SWAP_STATE_INVALID, "Chỉ hủy được đơn đang chờ duyệt");
        }
        entity.setStatus(RequestStatus.CANCELLED);
        entity.setUpdatedAt(AppTimeZones.now());
        swapRepository.save(entity);
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<ShiftSwapRequestResponse> search(RequestStatus status) {
        return buildResponses(swapRepository.search(status));
    }

    @Transactional
    public ShiftSwapRequestResponse approve(UUID uuid, UUID actorId, String note) {
        ShiftSwapRequest entity = requirePending(uuid);
        ShiftAssignment a = requireFuture(entity.getRequesterAssignmentUuid());
        ShiftAssignment b = requireFuture(entity.getCounterpartAssignmentUuid());
        // Đảm bảo chủ sở hữu chưa thay đổi kể từ lúc tạo đơn.
        if (!a.getUserUuid().equals(entity.getRequesterUuid())
                || !b.getUserUuid().equals(entity.getCounterpartUuid())) {
            throw new AppException(ErrorCode.HR_SWAP_INVALID, "Ca đã thay đổi chủ sở hữu, không thể đổi");
        }
        shiftAssignmentService.applySwap(a, b, actorId);
        entity.setStatus(RequestStatus.APPROVED);
        finishReview(entity, actorId, note);
        pushNotify(entity.getRequesterUuid(), "Đổi ca được duyệt", "Yêu cầu đổi ca của bạn đã được duyệt.");
        pushNotify(entity.getCounterpartUuid(), "Đổi ca được duyệt", "Một ca của bạn đã được đổi theo yêu cầu và được quản lý duyệt.");
        return toResponse(entity);
    }

    @Transactional
    public ShiftSwapRequestResponse reject(UUID uuid, UUID actorId, String note) {
        ShiftSwapRequest entity = requirePending(uuid);
        entity.setStatus(RequestStatus.REJECTED);
        finishReview(entity, actorId, note);
        pushNotify(entity.getRequesterUuid(), "Đổi ca bị từ chối",
                "Yêu cầu đổi ca của bạn đã bị từ chối." + (note != null && !note.isBlank() ? " Lý do: " + note : ""));
        return toResponse(entity);
    }

    private void finishReview(ShiftSwapRequest entity, UUID actorId, String note) {
        entity.setReviewedBy(actorId);
        entity.setReviewedAt(AppTimeZones.now());
        entity.setReviewNote(note);
        entity.setUpdatedAt(AppTimeZones.now());
        swapRepository.save(entity);
    }

    private void pushNotify(UUID userId, String title, String content) {
        try {
            userNotificationService.createSystemNotification(userId, title, content, "shift_swap", SELF_SERVICE_URL);
        } catch (Exception ignored) {
            // Bỏ qua lỗi thông báo.
        }
    }

    private ShiftSwapRequest require(UUID uuid) {
        return swapRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_SWAP_NOT_FOUND));
    }

    private ShiftSwapRequest requirePending(UUID uuid) {
        ShiftSwapRequest entity = require(uuid);
        if (entity.getStatus() != RequestStatus.PENDING) {
            throw new AppException(ErrorCode.HR_SWAP_STATE_INVALID, "Đơn đã được xử lý trước đó");
        }
        return entity;
    }

    /** Yêu cầu một phân ca tồn tại, đang SCHEDULED và chưa bắt đầu. */
    private ShiftAssignment requireFuture(UUID uuid) {
        ShiftAssignment a = assignmentRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_ASSIGNMENT_NOT_FOUND));
        if (a.getStatus() != ShiftAssignmentStatus.SCHEDULED) {
            throw new AppException(ErrorCode.HR_SWAP_INVALID, "Ca đã bị hủy nên không thể đổi");
        }
        ShiftDefinition shift = directory.requireShift(a.getShiftDefinitionUuid());
        LocalTime st = shift.getStartTime() != null ? shift.getStartTime() : LocalTime.MIDNIGHT;
        LocalDateTime shiftStart = a.getWorkDate().atTime(st);
        if (!AppTimeZones.now().toLocalDateTime().isBefore(shiftStart)) {
            throw new AppException(ErrorCode.HR_SWAP_INVALID, "Chỉ đổi được ca chưa bắt đầu");
        }
        return a;
    }

    private List<ShiftSwapRequestResponse> buildResponses(List<ShiftSwapRequest> list) {
        if (list.isEmpty()) {
            return List.of();
        }
        Set<UUID> userIds = new HashSet<>();
        Set<UUID> assignmentIds = new HashSet<>();
        for (ShiftSwapRequest s : list) {
            userIds.add(s.getRequesterUuid());
            userIds.add(s.getCounterpartUuid());
            assignmentIds.add(s.getRequesterAssignmentUuid());
            assignmentIds.add(s.getCounterpartAssignmentUuid());
        }
        Map<UUID, User> users = directory.usersByIds(userIds);
        Map<UUID, ShiftAssignment> assignments = assignmentRepository.findAllById(assignmentIds).stream()
                .collect(Collectors.toMap(ShiftAssignment::getUuid, a -> a, (a, b) -> a));
        Map<UUID, ShiftDefinition> shifts = directory.shiftMap();
        List<ShiftSwapRequestResponse> out = new ArrayList<>();
        for (ShiftSwapRequest s : list) {
            out.add(toResponse(s, users, assignments, shifts));
        }
        return out;
    }

    private ShiftSwapRequestResponse toResponse(ShiftSwapRequest s) {
        return toResponse(s, directory.usersByIds(Set.of(s.getRequesterUuid(), s.getCounterpartUuid())),
                assignmentRepository.findAllById(
                        Set.of(s.getRequesterAssignmentUuid(), s.getCounterpartAssignmentUuid())).stream()
                        .collect(Collectors.toMap(ShiftAssignment::getUuid, a -> a, (a, b) -> a)),
                directory.shiftMap());
    }

    private ShiftSwapRequestResponse toResponse(ShiftSwapRequest s, Map<UUID, User> users,
            Map<UUID, ShiftAssignment> assignments, Map<UUID, ShiftDefinition> shifts) {
        return new ShiftSwapRequestResponse(
                s.getUuid(),
                s.getStatus().name(),
                s.getNote(),
                s.getReviewNote(),
                s.getReviewedAt(),
                s.getCreatedAt(),
                party(s.getRequesterUuid(), s.getRequesterAssignmentUuid(), users, assignments, shifts),
                party(s.getCounterpartUuid(), s.getCounterpartAssignmentUuid(), users, assignments, shifts));
    }

    private ShiftSwapRequestResponse.Party party(UUID userId, UUID assignmentId,
            Map<UUID, User> users, Map<UUID, ShiftAssignment> assignments, Map<UUID, ShiftDefinition> shifts) {
        User user = users.get(userId);
        ShiftAssignment a = assignments.get(assignmentId);
        ShiftDefinition shift = a != null ? shifts.get(a.getShiftDefinitionUuid()) : null;
        return new ShiftSwapRequestResponse.Party(
                userId,
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                assignmentId,
                shift != null ? shift.getName() : null,
                a != null ? a.getWorkDate() : null,
                shift != null ? shift.getStartTime() : null,
                shift != null ? shift.getEndTime() : null);
    }
}
