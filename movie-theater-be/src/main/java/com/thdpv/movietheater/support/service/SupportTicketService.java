package com.thdpv.movietheater.support.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.dto.request.SupportTicketCreateRequest;
import com.thdpv.movietheater.support.dto.response.SupportTicketMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportTicketResponse;
import com.thdpv.movietheater.support.entity.SupportTicket;
import com.thdpv.movietheater.support.entity.SupportTicketMessage;
import com.thdpv.movietheater.support.repository.SupportTicketMessageRepository;
import com.thdpv.movietheater.support.repository.SupportTicketRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class SupportTicketService {

    private static final Logger log = LoggerFactory.getLogger(SupportTicketService.class);

    private static final Set<String> CLOSED_STATUSES = Set.of("DONE", "RESOLVED", "CLOSED");
    private static final String ACTIVE_TICKET_MESSAGE =
            "Khách hàng chỉ được gửi 1 ticket 1 lần cho đến khi hoàn thành.";
    private static final int MAX_IMAGES_PER_MESSAGE = 3;
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif");

    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketMessageRepository supportTicketMessageRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Cloudinary cloudinary;
    private final SupportContentModerationService contentModerationService;

    public SupportTicketService(
            SupportTicketRepository supportTicketRepository,
            SupportTicketMessageRepository supportTicketMessageRepository,
            UserRepository userRepository,
            ApplicationEventPublisher eventPublisher,
            Cloudinary cloudinary,
            SupportContentModerationService contentModerationService) {
        this.supportTicketRepository = supportTicketRepository;
        this.supportTicketMessageRepository = supportTicketMessageRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.cloudinary = cloudinary;
        this.contentModerationService = contentModerationService;
    }

    @Transactional
    public SupportTicketResponse create(String ownerEmail, SupportTicketCreateRequest request) {
        contentModerationService.assertChatAllowed(ownerEmail);
        assertNoActiveSupport(ownerEmail);
        String description = request.getDescription().trim();
        contentModerationService.assertCleanUserText(ownerEmail, description);
        SupportTicket ticket = new SupportTicket();
        ticket.setTicketCode(generateTicketCode());
        ticket.setOwnerEmail(ownerEmail);
        ticket.setOwnerName(userRepository.findByEmailIgnoreCase(ownerEmail).map(u -> u.getFullName()).orElse(null));
        ticket.setCategory(request.getCategory().trim());
        ticket.setDescription(description);
        ticket.setStatus("PENDING");
        ticket.setReadByAdmin(false);
        ticket.setLastMessage(description);
        ticket.setLastMessageSender("USER");

        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "USER", saved.getOwnerName(), description, List.of());
        return map(saved);
    }

    @Transactional(readOnly = true)
    public void assertNoActiveSupport(String ownerEmail) {
        boolean hasActive = supportTicketRepository.findByOwnerEmailOrderByCreatedAtDesc(ownerEmail).stream()
                .anyMatch(ticket -> ticket != null && ticket.getStatus() != null
                        && !CLOSED_STATUSES.contains(ticket.getStatus().trim().toUpperCase()));
        if (hasActive) {
            throw new AppException(ErrorCode.BAD_REQUEST, ACTIVE_TICKET_MESSAGE);
        }
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listMine(String ownerEmail) {
        return supportTicketRepository.findByOwnerEmailOrderByCreatedAtDesc(ownerEmail)
                .stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listAll() {
        return supportTicketRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<SupportTicketResponse> listAll(Pageable pageable) {
        return supportTicketRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::map);
    }

    @Transactional(readOnly = true)
    public SupportTicketResponse getByCode(String ticketCode) {
        return supportTicketRepository.findByTicketCode(ticketCode)
                .map(this::map)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
    }

    @Transactional(readOnly = true)
    public List<SupportTicketMessageResponse> listMessages(String ticketCode) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        return supportTicketMessageRepository.findByTicketUuidOrderByCreatedAtAsc(ticket.getUuid())
                .stream()
                .map(this::mapMessage)
                .toList();
    }

    public List<String> uploadUserImages(String ownerEmail, MultipartFile[] files) {
        contentModerationService.assertChatAllowed(ownerEmail);
        return uploadImages(files, ownerEmail, true);
    }

    public List<String> uploadAdminImages(MultipartFile[] files) {
        return uploadImages(files, null, false);
    }

    @SuppressWarnings({ "rawtypes", "unchecked" })
    private List<String> uploadImages(
            MultipartFile[] files,
            String ownerEmail,
            boolean penalizeUser) {
        if (files == null || files.length == 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chưa chọn ảnh nào.");
        }
        if (files.length > MAX_IMAGES_PER_MESSAGE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mỗi lần chỉ gửi tối đa 3 ảnh.");
        }

        List<MultipartFile> validFiles = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            validateImageFile(file);
            validFiles.add(file);
        }
        if (validFiles.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không có ảnh hợp lệ để tải lên.");
        }

        // Upload in parallel, then moderate in order (keeps error cleanup simple).
        List<Map> uploadedResults = new ArrayList<>(Collections.nCopies(validFiles.size(), null));
        List<Exception> failures = Collections.synchronizedList(new ArrayList<>());
        IntStream.range(0, validFiles.size()).parallel().forEach(index -> {
            try {
                uploadedResults.set(index, uploadSupportImage(validFiles.get(index)));
            } catch (RuntimeException error) {
                failures.add(error);
            }
        });
        if (!failures.isEmpty()) {
            uploadedResults.stream().filter(Objects::nonNull)
                    .forEach(contentModerationService::destroyUploaded);
            Exception first = failures.get(0);
            if (first instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Không tải được ảnh lên lúc này.");
        }

        List<String> urls = new ArrayList<>();
        try {
            for (Map uploadResult : uploadedResults) {
                contentModerationService.assertImageApproved(
                        uploadResult,
                        ownerEmail,
                        penalizeUser);
                String url = (String) uploadResult.get("secure_url");
                if (url == null || url.isBlank()) {
                    throw new AppException(ErrorCode.INTERNAL_ERROR, "Upload ảnh thất bại.");
                }
                urls.add(url);
            }
        } catch (RuntimeException error) {
            uploadedResults.stream().filter(Objects::nonNull)
                    .forEach(contentModerationService::destroyUploaded);
            throw error;
        }

        return urls;
    }

    @SuppressWarnings({ "rawtypes", "unchecked" })
    private Map uploadSupportImage(MultipartFile file) {
        if (!contentModerationService.isImageSupportEnabled()) {
            throw new AppException(
                    ErrorCode.SUPPORT_IMAGE_MODERATION_PENDING,
                    "Kiểm duyệt ảnh chưa sẵn sàng nên hệ thống tạm từ chối ảnh. Vui lòng thử lại sau.");
        }
        try {
            return cloudinary.uploader().upload(
                    file.getBytes(),
                    contentModerationService.buildImageUploadOptions());
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Upload ảnh support thất bại: {} — {}", e.getClass().getSimpleName(), e.getMessage());
            throw new AppException(
                    ErrorCode.INTERNAL_ERROR,
                    "Không tải được ảnh lên lúc này. Vui lòng thử lại sau.");
        }
    }

    @Transactional
    public SupportTicketResponse addUserMessage(
            String ticketCode,
            String ownerEmail,
            String message,
            List<String> imageUrls) {
        contentModerationService.assertChatAllowed(ownerEmail);
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền gửi vào ticket này.");
        }
        String status = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase();
        if (CLOSED_STATUSES.contains(status)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ticket đã đóng, không thể gửi thêm tin nhắn.");
        }

        String trimmedMessage = normalizeMessage(message);
        contentModerationService.assertCleanUserText(ownerEmail, trimmedMessage);
        List<String> normalizedImages = normalizeImageUrls(imageUrls);
        assertMessageOrImages(trimmedMessage, normalizedImages);

        String lastPreview = resolveLastMessagePreview(trimmedMessage, normalizedImages);
        ticket.setLastMessage(lastPreview);
        ticket.setLastMessageSender("USER");
        ticket.setReadByAdmin(false);
        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "USER", saved.getOwnerName(), trimmedMessage, normalizedImages);
        return map(saved);
    }

    @Transactional
    public SupportTicketResponse addAdminMessage(
            String ticketCode,
            String adminEmail,
            String message,
            String status,
            List<String> imageUrls) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        String adminDisplayName = resolveUserDisplayName(adminEmail);
        String trimmedMessage = normalizeMessage(message);
        List<String> normalizedImages = normalizeImageUrls(imageUrls);
        assertMessageOrImages(trimmedMessage, normalizedImages);

        String lastMessagePreview = resolveLastMessagePreview(trimmedMessage, normalizedImages);
        ticket.setLastMessage(lastMessagePreview);
        ticket.setLastMessageSender("ADMIN");
        ticket.setReadByAdmin(true);
        if (status != null && !status.isBlank()) {
            ticket.setStatus(status.trim().toUpperCase());
        }
        ticket.setAnswer(lastMessagePreview);
        if (ticket.getAssignedStaffName() == null || ticket.getAssignedStaffName().isBlank()) {
            ticket.setAssignedStaffEmail(adminEmail != null ? adminEmail.trim().toLowerCase() : null);
            ticket.setAssignedStaffName(adminDisplayName);
        }
        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "ADMIN", adminDisplayName, trimmedMessage, normalizedImages);
        return map(saved);
    }

    @Transactional
    public SupportTicketResponse cancelByOwner(String ticketCode, String ownerEmail) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        if (!ticket.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền hủy ticket này.");
        }
        String status = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase();
        if (CLOSED_STATUSES.contains(status)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Ticket đã đóng, không thể hủy thêm.");
        }
        ticket.setStatus("CLOSED");
        ticket.setLiveRequested(false);
        ticket.setLiveConnected(false);
        ticket.setReadByAdmin(false);
        ticket.setLastMessage("Khách đã hủy yêu cầu hỗ trợ.");
        ticket.setLastMessageSender("USER");
        SupportTicket saved = supportTicketRepository.save(ticket);
        saveMessage(saved.getUuid(), "SYSTEM", "NASA BOT", "Khách đã hủy yêu cầu hỗ trợ này.", List.of());

        // Khách đã hủy hỗ trợ: gỡ ảnh đính kèm khỏi Cloudinary và khỏi lịch sử tin nhắn.
        cleanupTicketImages(saved.getUuid());
        return map(saved);
    }

    @Transactional
    public SupportTicketResponse updateStatus(String ticketCode, String status) {
        return updateStatus(ticketCode, status, null);
    }

    @Transactional
    public SupportTicketResponse updateStatus(String ticketCode, String status, String adminEmail) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        String nextStatus = status.trim().toUpperCase();
        ticket.setStatus(nextStatus);
        if ("IN_PROGRESS".equals(nextStatus) && adminEmail != null && !adminEmail.isBlank()) {
            ticket.setReadByAdmin(true);
            if (ticket.getAssignedStaffName() == null || ticket.getAssignedStaffName().isBlank()) {
                ticket.setAssignedStaffEmail(adminEmail.trim().toLowerCase());
                ticket.setAssignedStaffName(resolveUserDisplayName(adminEmail));
            }
        }
        SupportTicket saved = supportTicketRepository.save(ticket);
        if ("IN_PROGRESS".equals(nextStatus)) {
            eventPublisher.publishEvent(new SupportTicketEvent(saved.getTicketCode(), "ADMIN"));
        }
        return map(saved);
    }

    @Transactional
    public void delete(String ticketCode) {
        SupportTicket ticket = supportTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ticket hỗ trợ."));
        List<String> imageUrls = supportTicketMessageRepository
                .findByTicketUuidOrderByCreatedAtAsc(ticket.getUuid())
                .stream()
                .map(SupportTicketMessage::getImageUrls)
                .filter(urls -> urls != null && !urls.isEmpty())
                .flatMap(List::stream)
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .toList();

        supportTicketMessageRepository.deleteByTicketUuid(ticket.getUuid());
        supportTicketRepository.delete(ticket);
        eventPublisher.publishEvent(new SupportTicketDeletedEvent(ticketCode));

        // Xóa ảnh trên Cloudinary sau khi ticket đã xóa trong DB (best-effort).
        destroyCloudinaryImages(imageUrls);
    }

    private void cleanupTicketImages(UUID ticketUuid) {
        List<SupportTicketMessage> messages =
                supportTicketMessageRepository.findByTicketUuidOrderByCreatedAtAsc(ticketUuid);
        List<String> imageUrls = messages.stream()
                .map(SupportTicketMessage::getImageUrls)
                .filter(urls -> urls != null && !urls.isEmpty())
                .flatMap(List::stream)
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .toList();
        if (imageUrls.isEmpty()) {
            return;
        }
        for (SupportTicketMessage message : messages) {
            if (message.getImageUrls() != null && !message.getImageUrls().isEmpty()) {
                message.setImageUrls(List.of());
                supportTicketMessageRepository.save(message);
            }
        }
        destroyCloudinaryImages(imageUrls);
    }

    private void destroyCloudinaryImages(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return;
        }
        for (String imageUrl : imageUrls) {
            String publicId = extractCloudinaryPublicId(imageUrl);
            if (publicId == null || publicId.isBlank()) {
                log.warn("Không tách được public_id Cloudinary từ URL ảnh support: {}", imageUrl);
                continue;
            }
            try {
                Map<?, ?> result = cloudinary.uploader().destroy(
                        publicId, ObjectUtils.asMap("resource_type", "image", "invalidate", true));
                Object outcome = result != null ? result.get("result") : null;
                if (!"ok".equals(outcome)) {
                    log.warn("Cloudinary destroy '{}' trả về: {}", publicId, outcome);
                } else {
                    log.info("Đã xóa ảnh support trên Cloudinary: {}", publicId);
                }
            } catch (Exception e) {
                // Không chặn xóa ticket nếu Cloudinary lỗi; ảnh mồ côi có thể dọn sau.
                log.warn("Xóa ảnh Cloudinary '{}' thất bại: {}", publicId, e.getMessage());
            }
        }
    }

    private String extractCloudinaryPublicId(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        try {
            String marker = "/upload/";
            int idx = imageUrl.indexOf(marker);
            if (idx == -1) {
                return null;
            }

            String afterUpload = imageUrl.substring(idx + marker.length());

            // Bỏ version segment dạng v123456789/
            if (afterUpload.startsWith("v") && afterUpload.contains("/")) {
                afterUpload = afterUpload.substring(afterUpload.indexOf("/") + 1);
            }

            int queryIdx = afterUpload.indexOf('?');
            if (queryIdx != -1) {
                afterUpload = afterUpload.substring(0, queryIdx);
            }

            int dotIdx = afterUpload.lastIndexOf('.');
            if (dotIdx != -1) {
                afterUpload = afterUpload.substring(0, dotIdx);
            }

            return afterUpload.isBlank() ? null : afterUpload;
        } catch (Exception e) {
            return null;
        }
    }

    void saveMessage(UUID ticketUuid, String senderRole, String senderName, String message) {
        saveMessage(ticketUuid, senderRole, senderName, message, List.of());
    }

    void saveMessage(
            UUID ticketUuid,
            String senderRole,
            String senderName,
            String message,
            List<String> imageUrls) {
        SupportTicketMessage ticketMessage = new SupportTicketMessage();
        ticketMessage.setTicketUuid(ticketUuid);
        ticketMessage.setSenderRole(senderRole);
        ticketMessage.setSenderName(senderName);
        ticketMessage.setMessage(message == null || message.isBlank() ? "" : message);
        ticketMessage.setImageUrls(imageUrls == null ? List.of() : imageUrls);
        supportTicketMessageRepository.save(ticketMessage);
        eventPublisher.publishEvent(new SupportTicketEvent(getTicketCodeByUuid(ticketUuid), senderRole));
    }

    SupportTicketResponse map(SupportTicket ticket) {
        SupportTicketResponse response = new SupportTicketResponse();
        response.setUuid(ticket.getUuid());
        response.setTicketCode(ticket.getTicketCode());
        response.setOwnerEmail(ticket.getOwnerEmail());
        response.setOwnerName(ticket.getOwnerName());
        response.setCategory(ticket.getCategory());
        response.setDescription(ticket.getDescription());
        response.setStatus(ticket.getStatus());
        response.setReadByAdmin(ticket.isReadByAdmin());
        response.setReplied(ticket.getAnswer() != null && !ticket.getAnswer().isBlank());
        response.setAnswer(ticket.getAnswer());
        response.setAdminNote(ticket.getAdminNote());
        response.setLastMessage(ticket.getLastMessage());
        response.setLastMessageSender(ticket.getLastMessageSender());
        response.setLiveRequested(ticket.isLiveRequested());
        response.setLiveConnected(ticket.isLiveConnected());
        response.setAssignedStaffEmail(ticket.getAssignedStaffEmail());
        response.setAssignedStaffName(ticket.getAssignedStaffName());
        response.setSatisfactionRating(ticket.getSatisfactionRating());
        response.setSatisfactionLabel(ticket.getSatisfactionLabel());
        response.setCreatedAt(ticket.getCreatedAt());
        response.setUpdatedAt(ticket.getUpdatedAt());
        return response;
    }

    private SupportTicketMessageResponse mapMessage(SupportTicketMessage message) {
        SupportTicketMessageResponse response = new SupportTicketMessageResponse();
        response.setUuid(message.getUuid());
        response.setTicketUuid(message.getTicketUuid());
        response.setSenderRole(message.getSenderRole());
        response.setSenderName(message.getSenderName());
        response.setMessage(message.getMessage());
        response.setImageUrls(message.getImageUrls() == null ? List.of() : List.copyOf(message.getImageUrls()));
        response.setCreatedAt(message.getCreatedAt());
        return response;
    }

    String generateTicketCode() {
        String code;
        do {
            code = "SR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (supportTicketRepository.existsByTicketCode(code));
        return code;
    }

    private String getTicketCodeByUuid(UUID uuid) {
        return supportTicketRepository.findById(uuid).map(SupportTicket::getTicketCode).orElse(null);
    }

    private String resolveUserDisplayName(String email) {
        if (email == null || email.isBlank()) {
            return "Staff";
        }
        String normalizedEmail = email.trim();
        return userRepository.findByEmailIgnoreCase(normalizedEmail)
                .map(user -> {
                    String fullName = user.getFullName();
                    if (fullName != null && !fullName.isBlank()) {
                        return fullName.trim();
                    }
                    return normalizedEmail;
                })
                .orElse(normalizedEmail);
    }

    private String normalizeMessage(String message) {
        return message == null ? "" : message.trim();
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }
        if (imageUrls.size() > MAX_IMAGES_PER_MESSAGE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mỗi tin nhắn chỉ đính kèm tối đa 3 ảnh.");
        }
        List<String> normalized = new ArrayList<>();
        for (String rawUrl : imageUrls) {
            if (rawUrl == null || rawUrl.isBlank()) {
                continue;
            }
            String url = rawUrl.trim();
            if (!isApprovedSupportImageUrl(url)) {
                throw new AppException(
                        ErrorCode.BAD_REQUEST,
                        "Ảnh đính kèm không hợp lệ hoặc chưa qua kiểm duyệt.");
            }
            if (!normalized.contains(url)) {
                normalized.add(url);
            }
        }
        return List.copyOf(normalized);
    }

    private boolean isApprovedSupportImageUrl(String url) {
        return url.startsWith("https://res.cloudinary.com/")
                && url.contains("/image/upload/")
                && url.contains("/support-attachments/");
    }

    private void assertMessageOrImages(String message, List<String> imageUrls) {
        if ((message == null || message.isBlank()) && (imageUrls == null || imageUrls.isEmpty())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Tin nhắn trống.");
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mỗi ảnh tối đa 5MB.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.");
        }
    }

    private String resolveLastMessagePreview(String message, List<String> imageUrls) {
        if (message != null && message.matches("\\[\\[sticker:[a-z0-9-]+\\]\\]")) {
            return "Nhãn cảm ơn từ staff";
        }
        if (message != null && !message.isBlank()) {
            return message;
        }
        int count = imageUrls == null ? 0 : imageUrls.size();
        if (count <= 0) {
            return "";
        }
        return count == 1 ? "Đã gửi 1 ảnh" : "Đã gửi " + count + " ảnh";
    }

    public record SupportTicketEvent(String ticketCode, String senderRole) {}

    public record SupportTicketDeletedEvent(String ticketCode) {}
}
