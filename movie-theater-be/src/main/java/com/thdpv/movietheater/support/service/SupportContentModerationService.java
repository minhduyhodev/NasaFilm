package com.thdpv.movietheater.support.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.cloudinary.Cloudinary;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.service.SystemConfigService;

/**
 * Moderates support chat text (banned words) and uploaded images:
 * <ul>
 *   <li>Sensitive (18+, gore, sexual harassment) → hide + escalating chat ban</li>
 *   <li>Unrelated to NASAFilm support → reject with guidance (no ban)</li>
 * </ul>
 */
@Service
public class SupportContentModerationService {

    private static final Logger log = LoggerFactory.getLogger(SupportContentModerationService.class);

    private static final String SENSITIVE_HIDE_MESSAGE =
            "Ảnh nhạy cảm (18+, bạo lực/máu me, quấy rối tình dục…) đã bị ẩn và không được gửi.";

    private static final String UNRELATED_MESSAGE =
            "Vui lòng gửi ảnh liên quan tới lỗi trên NASAFilm (ví dụ: màn hình lỗi thanh toán, mã vé/QR, voucher, tài khoản).";

    private static final List<String> SENSITIVE_LABEL_HINTS = List.of(
            "explicit", "nudity", "sexual", "suggestive", "adult", "porn",
            "violence", "blood", "gore", "visually disturbing", "graphic",
            "hate", "harass", "weapon");

    private static final String RELEVANCE_PROMPT = """
            You classify ONE support-ticket attachment for NASAFilm (movie ticket / cinema website).
            Reply with exactly one token: SENSITIVE or RELATED or UNRELATED.
            SENSITIVE = pornography, nudity, sexual harassment, extreme gore/blood, graphic violence.
            RELATED = screenshot or photo useful for support: NASAFilm UI, payment error, ticket/QR, booking, voucher, login/account error, cinema app screen.
            UNRELATED = memes, random selfies, food, landscapes, pets, ads, or anything not about a NASAFilm problem.
            """;

    /**
     * Checked against original text (with diacritics) so they do not collide with
     * common Vietnamese words after NFD strip (e.g. "cặc" → "cac" vs "các").
     */
    private static final List<String> DIACRITIC_BANNED_WORDS = List.of(
            "cặc", "lồn", "địt", "đụ", "cứt", "đéo", "cặt", "lìn");

    private static final List<String> DEFAULT_BANNED_WORDS = List.of(
            "dm", "dmm", "dit", "dit me", "du ma", "duma", "clm", "cc", "lon", "cac",
            "cai lon", "chui", "fuck", "shit", "bitch", "asshole", "dick", "pussy",
            "đm", "đmm", "vcl", "vl", "đjt", "đjt mẹ", "đụ má", "đụ mẹ");

    private final SystemConfigService systemConfigService;
    private final Cloudinary cloudinary;
    private final SupportChatPenaltyService penaltyService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String imageModerationKind;
    private final String visionApiKey;
    private final String visionModel;
    private final String visionApiUrl;

    public SupportContentModerationService(
            SystemConfigService systemConfigService,
            Cloudinary cloudinary,
            SupportChatPenaltyService penaltyService,
            ObjectMapper objectMapper,
            @Value("${cloudinary.support.moderation:none}") String imageModerationKind,
            @Value("${app.groq.api-key:}") String visionApiKey,
            @Value("${app.groq.model:}") String visionModel,
            @Value("${app.support.vision.model:}") String supportVisionModel,
            @Value("${app.groq.api-url:}") String visionApiUrl) {
        this.systemConfigService = systemConfigService;
        this.cloudinary = cloudinary;
        this.penaltyService = penaltyService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.imageModerationKind = imageModerationKind == null ? "" : imageModerationKind.trim();
        this.visionApiKey = visionApiKey == null ? "" : visionApiKey.trim();
        String dedicated = supportVisionModel == null ? "" : supportVisionModel.trim();
        String fallbackModel = visionModel == null ? "" : visionModel.trim();
        this.visionModel = !dedicated.isBlank() ? dedicated : fallbackModel;
        this.visionApiUrl = visionApiUrl == null ? "" : visionApiUrl.trim();
    }

    public void assertCleanUserText(String userEmail, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        if (containsBannedWord(text)) {
            SupportChatPenaltyService.PenaltyResult penalty =
                    penaltyService.recordTextViolation(userEmail);
            penaltyService.raiseViolation(ErrorCode.SUPPORT_BANNED_WORD, null, penalty);
        }
    }

    public void assertChatAllowed(String userEmail) {
        penaltyService.assertChatAllowed(userEmail);
    }

    public void recordAiTextViolation(String userEmail) {
        if (userEmail != null && !userEmail.isBlank()) {
            penaltyService.recordTextViolation(userEmail);
        }
    }

    public boolean containsBannedWord(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        if (containsDiacriticBannedWord(text)) {
            return true;
        }
        String normalized = stripDiacritics(text)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (normalized.isBlank()) {
            return false;
        }
        for (String banned : resolveBannedWords()) {
            String token = stripDiacritics(banned)
                    .replaceAll("[^a-z0-9\\s]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();
            if (token.isBlank()) {
                continue;
            }
            if (token.contains(" ")) {
                if (normalized.contains(token)) {
                    return true;
                }
            } else if (matchesWholeWord(normalized, token)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Upload options for support images.
     * Do NOT attach Cloudinary moderation add-ons by default — unpaid/unavailable
     * add-ons (aws_rek) cause the entire upload to fail. Safety is enforced after
     * upload via AI vision in {@link #assertImageApproved}.
     */
    public Map<String, Object> buildImageUploadOptions() {
        Map<String, Object> options = new HashMap<>();
        options.put("folder", "support-attachments");
        options.put("resource_type", "image");
        // Only attach when explicitly a known working add-on string other than none/off.
        // Kept off by default (CLOUDINARY_SUPPORT_MODERATION=none).
        if (isImageModerationEnabled()) {
            log.info("Cloudinary moderation add-on enabled: {}", imageModerationKind);
            options.put("moderation", imageModerationKind);
        }
        return options;
    }

    /** Legacy name — kept for callers. True if Cloudinary aws_rek moderation is configured. */
    public boolean isImageModerationEnabled() {
        return !imageModerationKind.isBlank()
                && !"none".equalsIgnoreCase(imageModerationKind)
                && !"off".equalsIgnoreCase(imageModerationKind);
    }

    /** Image attachments are allowed when at least one moderator (AI vision or aws_rek) is available. */
    public boolean isImageSupportEnabled() {
        return isVisionConfigured() || isImageModerationEnabled();
    }

    /**
     * Sensitive → destroy + ban. Unrelated to NASAFilm → destroy + soft reject.
     * Safe & related → allow. Cloudinary aws_rek is honored if present, but AI vision
     * is the primary gate so the feature works without the paid add-on.
     */
    public void assertImageApproved(
            Map<?, ?> uploadResult,
            String userEmail,
            boolean penalizeUser) {
        if (uploadResult == null) {
            throw new AppException(ErrorCode.SUPPORT_IMAGE_MODERATION_PENDING);
        }

        // 1) Honor Cloudinary aws_rek result when the add-on is active.
        Object moderation = uploadResult.get("moderation");
        if (moderation instanceof List<?> entries && !entries.isEmpty()) {
            String labelBlob = "";
            for (Object entry : entries) {
                if (!(entry instanceof Map<?, ?> map)) {
                    continue;
                }
                String status = String.valueOf(map.get("status")).trim().toLowerCase(Locale.ROOT);
                labelBlob = labelBlob + " " + extractModerationLabels(map);
                if ("rejected".equals(status)) {
                    rejectSensitive(uploadResult, userEmail, penalizeUser);
                    return;
                }
            }
            if (looksSensitiveFromLabels(labelBlob)) {
                rejectSensitive(uploadResult, userEmail, penalizeUser);
                return;
            }
        }

        // Admin uploads: trust staff — skip slow vision round-trip.
        if (!penalizeUser) {
            return;
        }

        // 2) AI vision is the main classifier (sensitive vs related vs unrelated).
        String imageUrl = firstNonBlank(
                uploadResult.get("secure_url"),
                uploadResult.get("url"));
        // Ask vision to fetch a smaller derivative when possible (faster).
        imageUrl = toFastVisionUrl(imageUrl);

        ImageVerdict vision = classifyWithVision(imageUrl);
        switch (vision) {
            case SENSITIVE -> rejectSensitive(uploadResult, userEmail, penalizeUser);
            case UNRELATED -> {
                destroyUploaded(uploadResult);
                throw new AppException(ErrorCode.SUPPORT_IMAGE_UNRELATED, UNRELATED_MESSAGE);
            }
            case RELATED -> {
                // allow
            }
            case UNKNOWN -> {
                // No verifier could run. Allow so the feature keeps working, but log it.
                if (!isVisionConfigured() && !isImageModerationEnabled()) {
                    log.warn("Support image accepted without moderation (no vision/aws_rek configured).");
                } else {
                    log.warn("Support image moderation inconclusive — accepting by fallback.");
                }
            }
            default -> {
                // allow
            }
        }
    }

    private void rejectSensitive(
            Map<?, ?> uploadResult,
            String userEmail,
            boolean penalizeUser) {
        destroyUploaded(uploadResult);
        if (penalizeUser) {
            SupportChatPenaltyService.PenaltyResult penalty =
                    penaltyService.recordSensitiveImageViolation(userEmail);
            penaltyService.raiseViolation(
                    ErrorCode.SUPPORT_IMAGE_INAPPROPRIATE,
                    SENSITIVE_HIDE_MESSAGE,
                    penalty);
        }
        throw new AppException(ErrorCode.SUPPORT_IMAGE_INAPPROPRIATE, SENSITIVE_HIDE_MESSAGE);
    }

    private ImageVerdict classifyWithVision(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank() || !isVisionConfigured()) {
            return ImageVerdict.UNKNOWN;
        }
        try {
            Map<String, Object> textPart = Map.of("type", "text", "text", RELEVANCE_PROMPT);
            Map<String, Object> imagePart = Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", imageUrl));
            Map<String, Object> userMessage = Map.of(
                    "role", "user",
                    "content", List.of(textPart, imagePart));
            Map<String, Object> body = new HashMap<>();
            body.put("model", visionModel);
            body.put("messages", List.of(userMessage));
            body.put("max_tokens", 8);
            body.put("temperature", 0);

            String payload = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(visionApiUrl))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + visionApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Support image vision classify HTTP {}", response.statusCode());
                return ImageVerdict.UNKNOWN;
            }
            JsonNode root = objectMapper.readTree(response.body());
            String reply = root.path("choices").path(0).path("message").path("content").asText("");
            return parseVerdict(reply);
        } catch (Exception e) {
            log.warn("Support image vision classify failed: {}", e.getMessage());
            return ImageVerdict.UNKNOWN;
        }
    }

    private boolean isVisionConfigured() {
        return !visionApiKey.isBlank() && !visionModel.isBlank() && !visionApiUrl.isBlank();
    }

    static ImageVerdict parseVerdict(String raw) {
        if (raw == null || raw.isBlank()) {
            return ImageVerdict.UNKNOWN;
        }
        String text = raw.trim().toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (text.contains("SENSITIVE")) {
            return ImageVerdict.SENSITIVE;
        }
        if (text.contains("UNRELATED")) {
            return ImageVerdict.UNRELATED;
        }
        if (text.contains("RELATED")) {
            return ImageVerdict.RELATED;
        }
        return ImageVerdict.UNKNOWN;
    }

    private static boolean looksSensitiveFromLabels(String labels) {
        if (labels == null || labels.isBlank()) {
            return false;
        }
        String lower = labels.toLowerCase(Locale.ROOT);
        return SENSITIVE_LABEL_HINTS.stream().anyMatch(lower::contains);
    }

    @SuppressWarnings("unchecked")
    private static String extractModerationLabels(Map<?, ?> moderationEntry) {
        StringBuilder out = new StringBuilder();
        Object response = moderationEntry.get("response");
        if (!(response instanceof Map<?, ?> responseMap)) {
            return String.valueOf(moderationEntry);
        }
        Object labels = responseMap.get("moderation_labels");
        if (labels == null) {
            labels = responseMap.get("ModerationLabels");
        }
        if (labels instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> labelMap) {
                    Object name = labelMap.get("name");
                    if (name == null) {
                        name = labelMap.get("Name");
                    }
                    if (name != null) {
                        out.append(' ').append(name);
                    }
                } else if (item != null) {
                    out.append(' ').append(item);
                }
            }
        }
        return out.toString();
    }

    private static String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value != null) {
                String text = String.valueOf(value).trim();
                if (!text.isBlank() && !"null".equalsIgnoreCase(text)) {
                    return text;
                }
            }
        }
        return null;
    }

    /** Prefer a downscaled Cloudinary derivative so the vision model fetches less data. */
    static String toFastVisionUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        String marker = "/image/upload/";
        int idx = url.indexOf(marker);
        if (idx < 0) {
            return url;
        }
        int insertAt = idx + marker.length();
        // Avoid double-inserting transforms.
        String after = url.substring(insertAt);
        if (after.startsWith("w_") || after.startsWith("c_") || after.startsWith("q_")) {
            return url;
        }
        return url.substring(0, insertAt) + "w_768,c_limit,q_auto,f_jpg/" + after;
    }

    public void destroyUploaded(Map<?, ?> uploadResult) {
        if (uploadResult == null) {
            return;
        }
        Object publicId = uploadResult.get("public_id");
        if (publicId == null || String.valueOf(publicId).isBlank()) {
            return;
        }
        try {
            Map<String, Object> destroyOptions = new HashMap<>();
            destroyOptions.put("invalidate", true);
            destroyOptions.put("resource_type", "image");
            cloudinary.uploader().destroy(String.valueOf(publicId), destroyOptions);
        } catch (Exception e) {
            log.warn("Không xóa được ảnh support bị từ chối '{}': {}", publicId, e.getMessage());
        }
    }

    private List<String> resolveBannedWords() {
        Set<String> words = new LinkedHashSet<>(DEFAULT_BANNED_WORDS);
        try {
            Object nasaBot = systemConfigService.getConfig().get("nasaBot");
            if (nasaBot instanceof Map<?, ?> botMap) {
                Object raw = botMap.get("bannedWords");
                if (raw instanceof List<?> items) {
                    for (Object item : items) {
                        if (item instanceof String text && !text.isBlank()) {
                            words.add(text.trim().toLowerCase(Locale.ROOT));
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // keep defaults
        }
        try {
            for (String word : systemConfigService.getReviewBannedWords()) {
                if (word != null && !word.isBlank()) {
                    words.add(word.trim().toLowerCase(Locale.ROOT));
                }
            }
        } catch (Exception ignored) {
            // keep defaults
        }
        return new ArrayList<>(words);
    }

    private boolean containsDiacriticBannedWord(String originalText) {
        String lower = originalText.toLowerCase(Locale.ROOT);
        String cleaned = lower
                .replaceAll("[^a-z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return DIACRITIC_BANNED_WORDS.stream()
                .anyMatch(word -> matchesWholeWord(cleaned, word));
    }

    private static boolean matchesWholeWord(String text, String word) {
        Pattern pattern = Pattern.compile(
                "(?<![\\p{L}\\p{N}])" + Pattern.quote(word) + "(?![\\p{L}\\p{N}])");
        return pattern.matcher(text).find();
    }

    private static String stripDiacritics(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    enum ImageVerdict {
        SENSITIVE,
        RELATED,
        UNRELATED,
        UNKNOWN
    }
}
