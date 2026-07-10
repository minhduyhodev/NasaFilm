package com.thdpv.movietheater.support.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.config.service.SystemConfigService;

@Service
public class SupportAiService {

    private static final Logger log = LoggerFactory.getLogger(SupportAiService.class);
    private static final int MAX_RETRIES = 2;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();
    private final ObjectMapper objectMapper;
    private final SystemConfigService systemConfigService;

    @Value("${app.openai.api-key:}")
    private String openaiApiKey;

    @Value("${app.openai.model:gpt-4o-mini}")
    private String openaiModel;

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    public SupportAiService(ObjectMapper objectMapper, SystemConfigService systemConfigService) {
        this.objectMapper = objectMapper;
        this.systemConfigService = systemConfigService;
    }

    public SupportAiResult chat(String message, List<SupportAiMessage> history) {
        String detectedCategory = detectCategory(message);
        if (isGreetingOnly(message)) {
            return greetingReply();
        }
        if (containsBannedWord(message)) {
            return inappropriateReply();
        }
        if (isLowSignalMessage(message)) {
            return unclearReply();
        }
        if (!isConfigured()) {
            // In fallback mode, check ticket code early for fast routing
            if (hasTicketOrOrderCode(message)) {
                String reply = "Mình đã nhận mã " + extractTicketOrOrderCode(message) + ". "
                    + "Bạn cho mình biết mã này đang gặp lỗi gì: sai vé, chưa nhận vé, cần đổi/hủy/hoàn vé hay lỗi quét QR để admin kiểm tra đúng hướng nhé.";
                return new SupportAiResult(reply, "ticket");
            }
            return fallback(message, history);
        }

        try {
            List<SupportAiMessage> messages = buildMessages(message, history);

            SupportAiResult aiResult = null;

            // 1. Try Groq first (free, OpenAI-compatible, fastest)
            if (isGroqConfigured()) {
                aiResult = callGroq(messages, detectedCategory);
            }
            // 2. Try Gemini (free tier)
            if (aiResult == null && isGeminiConfigured()) {
                aiResult = callGemini(messages, detectedCategory);
            }
            // 3. Fall back to OpenAI (paid)
            if (aiResult == null && isOpenaiConfigured()) {
                aiResult = callOpenAI(messages, detectedCategory);
            }

            if (aiResult != null) {
                // Post-process: detect if this is a ticket finalization by the AI
                return postProcessAiResult(aiResult, message, history);
            }

            // 4. All AI providers failed — use rule-based fallback
            return fallback(message, history);
        } catch (Exception error) {
            log.error("Unexpected error in AI chat flow", error);
            return fallback(message, history);
        }
    }

    /**
     * After AI responds, detect if the conversation has reached a ticket creation
     * milestone. If the AI's response looks like a finalization (contains keywords
     * like "ghi nhận", "tạo ticket", "gửi admin"), auto-create the ticket.
     */
    private SupportAiResult postProcessAiResult(SupportAiResult result, String userMessage, List<SupportAiMessage> history) {
        String reply = result.reply();
        if (reply == null) return result;

        String normalized = normalize(reply);
        boolean isFinalizing = normalized.contains("ghi nhan") || normalized.contains("ghi nhận")
            || (normalized.contains("tao ticket") && (normalized.contains("gui") || normalized.contains("gửi")))
            || (normalized.contains("da tao") && normalized.contains("ticket"))
            || (normalized.contains("da gui") && normalized.contains("ticket"))
            || (normalized.contains("chot ticket") && (normalized.contains("gui") || normalized.contains("gửi")))
            || (normalized.contains("admin se phan hoi") || normalized.contains("admin sẽ phản hồi"));

        if (isFinalizing) {
            String category = result.suggestedCategory();
            if (category == null || "other".equals(category)) {
                category = detectCategory(userMessage);
            }
            String summary = buildSummary(category, userMessage, history);
            String description = buildDescription(category, userMessage, history);
            return result.withTicketAction(new TicketAction(category, description, summary));
        }

        return result;
    }

    // ── Guided conversational flow (fallback mode) ──────────────────────────
    // Each category has a step-by-step Q&A flow. The bot asks one question
    // at a time, collects the answer, then moves to the next step.
    // After all fields are collected → confirmation → finalize.
    //
    // Flow states: "collecting" → "confirming" → "finalizing" → "done"

    private static final Map<String, String[]> CATEGORY_FLOW_FIELDS = Map.of(
        "ticket",    new String[]{"ticketCode", "issueType", "detail"},
        "payment",   new String[]{"orderCode", "paymentMethod", "issueType", "detail"},
        "account",   new String[]{"issueType", "errorStep", "detail"},
        "promo",     new String[]{"voucherCode", "issueType", "detail"},
        "membership",new String[]{"issueType", "detail"}
    );

    private static final Map<String, String[]> CATEGORY_FLOW_PROMPTS = Map.of(
        "ticket", new String[]{
            "🎫 Bạn vui lòng nhập **mã vé** hoặc **mã đơn hàng** giúp mình nhé.",
            "🔍 Mã vé này đang gặp vấn đề gì ạ?\n• Vé bị sai / nhầm (ghế, suất, phim, rạp)\n• Chưa nhận được vé sau khi thanh toán\n• Cần đổi / hủy / hoàn vé\n• Lỗi quét mã QR\n• Khác (mô tả thêm)",
            "📝 Bạn mô tả thêm chi tiết vấn đề để admin xử lý nhanh hơn nhé."
        },
        "payment", new String[]{
            "🧾 Bạn vui lòng nhập **mã đơn hàng** bị lỗi thanh toán giúp mình.",
            "💳 Bạn thanh toán qua phương thức nào? (Ví dụ: ZaloPay, MoMo, VNPay, thẻ ngân hàng, Stripe...)",
            "⚠️ Vấn đề thanh toán bạn gặp là gì?\n• Bị trừ tiền nhưng chưa nhận vé\n• Cần hoàn tiền / refund\n• Giao dịch bị lỗi / timeout\n• Khác (mô tả thêm)",
            "📝 Bạn mô tả thêm chi tiết (số tiền, thời gian giao dịch, thông báo lỗi nếu có) để admin đối soát nhé."
        },
        "account", new String[]{
            "👤 Bạn gặp vấn đề gì về tài khoản?\n• Không đăng nhập được\n• Không nhận được mã OTP\n• Quên mật khẩu\n• Tài khoản bị khóa\n• Cần cập nhật thông tin\n• Khác (mô tả thêm)",
            "🔄 Bạn đang bị lỗi ở bước nào? (Ví dụ: nhập OTP, nhập mật khẩu, xác thực email...)",
            "📝 Bạn mô tả thêm chi tiết và thông báo lỗi (nếu có) để kỹ thuật kiểm tra nhé."
        },
        "promo", new String[]{
            "🎁 Bạn vui lòng nhập **mã voucher** hoặc tên **chương trình khuyến mãi** gặp lỗi giúp mình.",
            "⚠️ Vấn đề bạn gặp với mã này là gì?\n• Không áp dụng được khi thanh toán\n• Mã đã hết hạn\n• Không đúng điều kiện áp dụng\n• Khác (mô tả thêm)",
            "📝 Bạn mô tả thêm chi tiết (thông báo lỗi, thời điểm áp dụng) để admin kiểm tra nhé."
        },
        "membership", new String[]{
            "👑 Bạn gặp vấn đề gì về hội viên?\n• Điểm thưởng chưa được cộng / bị sai\n• Hạng thành viên không đúng\n• Quyền lợi hội viên không được áp dụng\n• Khác (mô tả thêm)",
            "📝 Bạn mô tả thêm chi tiết (mã đơn liên quan, thời điểm phát sinh) để admin kiểm tra nhé."
        }
    );

    // Keywords that signal the user wants to confirm / finalize
    private static final java.util.Set<String> CONFIRM_YES = java.util.Set.of(
        "ok", "oke", "okay", "dc", "đc", "được", "duoc", "xac nhan", "gui", "gửi", "chot", "chốt",
        "dong y", "đồng ý", "tao ticket", "tao luon", "tao đi", "tao di",
        "khong chinh", "ko chinh", "không chỉnh", "ko chỉnh", "khong can chinh", "không cần chỉnh",
        "khong can sua", "không cần sửa", "khong sua", "ko sửa", "đúng rồi", "dung roi",
        "yes", "yeah", "yep", "fine", "good", "done", "xong", "chuẩn", "chuan"
    );

    private static final java.util.Set<String> CONFIRM_EDIT = java.util.Set.of(
        "sua", "sửa", "chinh", "chỉnh", "chinh sua", "chỉnh sửa", "edit", "change",
        "can sua", "cần sửa", "muon sua", "muốn sửa", "can chinh", "cần chỉnh",
        "khong", "ko", "không", "chua", "chưa", "sai", "nhằm", "nham", "lon", "lộn"
    );

    private SupportAiResult fallback(String message, List<SupportAiMessage> history) {
        String normalized = normalize(message);
        String category = detectCategory(message);

        // Thanks detection
        if (normalized.contains("cam on") || normalized.contains("thank") || normalized.contains("cám ơn")) {
            return new SupportAiResult("Không có gì bạn! Nếu cần thêm hỗ trợ thì cứ nhắn mình nhé. Chúc bạn xem phim vui vẻ! 🍿", "other");
        }

        // For "other" category, no structured flow
        if ("other".equals(category)) {
            return new SupportAiResult(
                "Mình chưa xác định rõ danh mục vấn đề của bạn. Bạn có thể chọn một trong các mục sau để mình hỗ trợ theo luồng nhé:\n"
                + "🎫 **Vé / Suất chiếu** — vấn đề về mã vé, ghế, suất chiếu, đổi/hủy/hoàn vé\n"
                + "💳 **Thanh toán** — lỗi giao dịch, trừ tiền, hoàn tiền\n"
                + "👤 **Tài khoản** — đăng nhập, OTP, mật khẩu\n"
                + "🎁 **Khuyến mãi** — voucher, combo, mã giảm giá\n"
                + "👑 **Hội viên** — điểm thưởng, hạng thành viên, quyền lợi\n\n"
                + "Bạn chọn danh mục nào ạ?",
                "other", "collecting"
            );
        }

        return guidedFlowReply(message, normalized, category, history);
    }

    private SupportAiResult guidedFlowReply(String message, String normalized, String category, List<SupportAiMessage> history) {
        String[] fields = CATEGORY_FLOW_FIELDS.get(category);
        String[] prompts = CATEGORY_FLOW_PROMPTS.get(category);
        if (fields == null || prompts == null) {
            return new SupportAiResult("Mình đã hiểu vấn đề. Bạn mô tả thêm để admin kiểm tra nhé.", category);
        }

        // Determine current flow step by analyzing conversation history
        int fieldsCollected = countCollectedFields(normalized, message, category, history);
        int totalFields = fields.length;

        // Check if user is responding to a confirmation prompt
        String lastBotMsg = getLastBotMessage(history);
        boolean wasConfirming = lastBotMsg != null && (
            lastBotMsg.contains("muốn chỉnh sửa") || lastBotMsg.contains("muốn chỉnh sửa thông tin"));

        boolean wasFinalizing = lastBotMsg != null && lastBotMsg.contains("chốt ticket");

        // ── State: User just confirmed ──
        if (wasConfirming) {
            if (containsAnyToken(normalized, CONFIRM_EDIT)) {
                // User wants to edit → restart the flow from field 1
                return new SupportAiResult(
                    "✅ Mình hiểu, bạn muốn chỉnh sửa thông tin. Mình sẽ hỏi lại từ đầu nhé.\n\n" + prompts[0],
                    category, "collecting"
                );
            }
            if (containsAnyToken(normalized, CONFIRM_YES)) {
                // User confirmed → finalize with auto ticket creation
                String summary = buildSummary(category, message, history);
                String description = buildDescription(category, message, history);
                return new SupportAiResult(
                    "✅ Đã ghi nhận thắc mắc của bạn! Mình đang tạo ticket gửi admin...\n📋 **Tóm tắt ticket:**\n" + summary
                    + "\n\n⏳ Admin sẽ phản hồi bạn trong thời gian sớm nhất.",
                    category, "finalizing"
                ).withTicketAction(new TicketAction(category, description, summary));
            }
            // Ambiguous response — ask again clearly
            return new SupportAiResult(
                "Mình chưa rõ ý bạn. Bạn chọn giúp mình nhé:\n"
                + "✏️ Gõ **\"sửa\"** để chỉnh sửa lại thông tin\n"
                + "✅ Gõ **\"ok\"** hoặc **\"gửi\"** để chốt ticket gửi admin",
                category, "confirming"
            );
        }

        // ── State: All fields collected, move to confirmation ──
        if (fieldsCollected >= totalFields) {
            String summary = buildSummary(category, message, history);
            return new SupportAiResult(
                "📋 Mình đã tổng hợp thông tin ticket của bạn như sau:\n\n" + summary
                + "\n\n---\n"
                + "✏️ Bạn có muốn **chỉnh sửa** thông tin nào không?\n"
                + "✅ Nếu thông tin đã đúng, gõ **\"ok\"** hoặc **\"gửi\"** để mình chốt ticket nhé.",
                category, "confirming"
            );
        }

        // ── State: Still collecting, ask next question ──
        int nextFieldIndex = Math.min(fieldsCollected, prompts.length - 1);
        String nextPrompt = prompts[nextFieldIndex];

        // Add context about what we already know
        StringBuilder sb = new StringBuilder();
        if (fieldsCollected > 0) {
            sb.append("✅ Mình đã ghi nhận. ");
        }
        sb.append(nextPrompt);

        // If we're on the last field, add hint about what comes next
        if (nextFieldIndex == prompts.length - 1) {
            sb.append("\n\n💡 *Sau bước này mình sẽ tổng hợp lại thông tin để bạn kiểm tra trước khi gửi admin.*");
        }

        return new SupportAiResult(sb.toString(), category, "collecting");
    }

    /** Count how many fields have been collected from the conversation so far. */
    private int countCollectedFields(String normalized, String message, String category, List<SupportAiMessage> history) {
        String[] fields = CATEGORY_FLOW_FIELDS.get(category);
        if (fields == null) return 0;

        int count = 0;
        for (int i = 0; i < fields.length; i++) {
            if (isFieldCollected(fields[i], normalized, message, category, history, i)) {
                count++;
            } else {
                break; // Stop at first missing field (sequential)
            }
        }
        return count;
    }

    /** Heuristic: has the user provided info for this field in the conversation? */
    private boolean isFieldCollected(String fieldName, String normalized, String currentMsg, String category, List<SupportAiMessage> history, int fieldIndex) {
        // For field 0 (ticketCode/orderCode/voucherCode): check if ticket/order code was extracted
        if (fieldIndex == 0 && ("ticket".equals(category) || "payment".equals(category))) {
            if (extractTicketOrOrderCode(currentMsg) != null) return true;
            // Also check history
            if (history != null) {
                for (int i = history.size() - 1; i >= 0; i--) {
                    SupportAiMessage m = history.get(i);
                    if ("user".equals(m.role()) && extractTicketOrOrderCode(m.content()) != null) return true;
                }
            }
            return false;
        }

        if (fieldIndex == 0 && "promo".equals(category)) {
            // Promo: check for voucher code pattern or meaningful text
            String v = normalized.replaceAll("[^a-z0-9]", "");
            return v.length() >= 3; // Short code or name provided
        }

        // For other fields: check if the message is substantial enough
        // (not just "ok", "yes", etc.)
        if (currentMsg != null) {
            String cleaned = currentMsg.replaceAll("\\s+", " ").trim();
            // Message longer than 10 chars excluding common confirm words = probably answering the question
            if (cleaned.length() > 10 && !CONFIRM_YES.contains(normalized) && !CONFIRM_EDIT.contains(normalized)) {
                return true;
            }
        }

        // For fields beyond the first: also check if a previous user message in history already answered this
        if (history != null && fieldIndex > 0) {
            int userMsgCount = 0;
            for (int i = history.size() - 1; i >= 0; i--) {
                SupportAiMessage m = history.get(i);
                if ("user".equals(m.role())) {
                    userMsgCount++;
                    if (userMsgCount > fieldIndex) {
                        String hNorm = normalize(m.content());
                        String hCleaned = m.content().replaceAll("\\s+", " ").trim();
                        if (hCleaned.length() > 10 && !CONFIRM_YES.contains(hNorm) && !CONFIRM_EDIT.contains(hNorm)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /** Build a ticket summary from collected fields. */
    private String buildSummary(String category, String message, List<SupportAiMessage> history) {
        StringBuilder sb = new StringBuilder();
        String[] fields = CATEGORY_FLOW_FIELDS.get(category);
        if (fields == null) return sb.toString();

        String[] fieldLabels = getFieldLabels(category);
        if (fieldLabels == null) return sb.toString();

        // Gather all user messages from history + current message
        List<String> userMessages = new ArrayList<>();
        if (history != null) {
            for (SupportAiMessage m : history) {
                if ("user".equals(m.role())) userMessages.add(m.content());
            }
        }
        userMessages.add(message);
        // Keep only the most recent N messages that are substantial
        List<String> substantial = new ArrayList<>();
        for (int i = userMessages.size() - 1; i >= 0 && substantial.size() < fields.length; i--) {
            String msg = userMessages.get(i);
            String cleaned = msg.replaceAll("\\s+", " ").trim();
            if (cleaned.length() > 3) {
                substantial.add(0, cleaned);
            }
        }

        // Category name
        String catName = switch (category) {
            case "ticket" -> "Vé / Suất chiếu";
            case "payment" -> "Thanh toán";
            case "account" -> "Tài khoản";
            case "promo" -> "Khuyến mãi";
            case "membership" -> "Hội viên";
            default -> category;
        };
        sb.append("**Danh mục:** ").append(catName).append("\n");

        // Fill in each field from collected messages
        for (int i = 0; i < fields.length && i < fieldLabels.length; i++) {
            String value = i < substantial.size() ? substantial.get(i) : "(chưa cung cấp)";
            // Truncate long values
            if (value.length() > 120) value = value.substring(0, 117) + "...";
            sb.append("**").append(fieldLabels[i]).append(":** ").append(value).append("\n");
        }

        return sb.toString();
    }

    /** Build plain text description for ticket body from collected user messages. */
    private String buildDescription(String category, String message, List<SupportAiMessage> history) {
        StringBuilder sb = new StringBuilder();
        String[] fieldLabels = getFieldLabels(category);
        if (fieldLabels == null) {
            sb.append(message.trim());
            return sb.toString();
        }

        // Gather all user messages
        List<String> userMessages = new ArrayList<>();
        if (history != null) {
            for (SupportAiMessage m : history) {
                if ("user".equals(m.role())) userMessages.add(m.content());
            }
        }
        userMessages.add(message);

        List<String> substantial = new ArrayList<>();
        for (int i = userMessages.size() - 1; i >= 0 && substantial.size() < fieldLabels.length; i--) {
            String msg = userMessages.get(i);
            String cleaned = msg.replaceAll("\\s+", " ").trim();
            if (cleaned.length() > 3) {
                substantial.add(0, cleaned);
            }
        }

        for (int i = 0; i < fieldLabels.length; i++) {
            String value = i < substantial.size() ? substantial.get(i) : "(chưa cung cấp)";
            if (value.length() > 500) value = value.substring(0, 497) + "...";
            sb.append(fieldLabels[i]).append(": ").append(value).append("\n");
        }

        return sb.toString();
    }

    private String[] getFieldLabels(String category) {
        return switch (category) {
            case "ticket"    -> new String[]{"Mã vé/đơn hàng", "Vấn đề", "Chi tiết"};
            case "payment"   -> new String[]{"Mã đơn hàng", "Phương thức TT", "Vấn đề", "Chi tiết"};
            case "account"   -> new String[]{"Vấn đề", "Bước bị lỗi", "Chi tiết"};
            case "promo"     -> new String[]{"Mã voucher/KM", "Vấn đề", "Chi tiết"};
            case "membership"-> new String[]{"Vấn đề", "Chi tiết"};
            default          -> new String[]{"Mô tả"};
        };
    }

    /** Get the last bot message from history. */
    private String getLastBotMessage(List<SupportAiMessage> history) {
        if (history == null) return null;
        for (int i = history.size() - 1; i >= 0; i--) {
            SupportAiMessage m = history.get(i);
            if ("assistant".equals(m.role()) || "bot".equals(m.role())) {
                return m.content();
            }
        }
        return null;
    }

    /** Check if normalized text contains any token from the given set (word-boundary aware). */
    private boolean containsAnyToken(String normalized, java.util.Set<String> tokens) {
        for (String token : tokens) {
            if (normalized.matches(".*\\b" + java.util.regex.Pattern.quote(token) + "\\b.*")) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAny(String normalized, String... keywords) {
        for (String keyword : keywords) {
            if (normalized.contains(normalize(keyword))) {
                return true;
            }
        }
        return false;
    }

    private String extractTicketOrOrderCode(String text) {
        if (text == null) {
            return null;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("\\b(?:TK|VE|OD|ORDER|TICKET)[A-Z0-9_-]{4,}\\b", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(text.trim());
        return matcher.find() ? matcher.group().toUpperCase() : null;
    }

    private boolean hasTicketOrOrderCode(String text) {
        return extractTicketOrOrderCode(text) != null;
    }

    private String detectCategory(String text) {
        if (hasTicketOrOrderCode(text)) {
            return "ticket";
        }
        String value = normalize(text);
        for (Map.Entry<String, List<String>> entry : categoryKeywords().entrySet()) {
            for (String keyword : entry.getValue()) {
                String normalizedKeyword = normalize(keyword).trim();
                if (!normalizedKeyword.isBlank() && value.matches(".*\\b" + java.util.regex.Pattern.quote(normalizedKeyword) + "\\b.*")) {
                    return entry.getKey();
                }
            }
        }
        return "other";
    }

    @SuppressWarnings("unchecked")
    private Map<String, List<String>> categoryKeywords() {
        try {
            Object nasaBot = systemConfigService.getConfig().get("nasaBot");
            if (nasaBot instanceof Map<?, ?> botMap) {
                Object keywords = ((Map<String, Object>) botMap).get("categoryKeywords");
                if (keywords instanceof Map<?, ?> keywordMap) {
                    return mergeCategoryKeywords((Map<String, Object>) keywordMap);
                }
            }
        } catch (Exception ignored) {
            // fallback below
        }
        return defaultCategoryKeywords();
    }

    private Map<String, List<String>> mergeCategoryKeywords(Map<String, Object> customKeywords) {
        Map<String, List<String>> merged = new java.util.LinkedHashMap<>(defaultCategoryKeywords());
        for (String category : defaultCategoryKeywords().keySet()) {
            Object value = customKeywords.get(category);
            if (value instanceof List<?> items) {
                List<String> normalizedItems = items.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .map(String::trim)
                        .filter(item -> !item.isBlank())
                        .toList();
                if (!normalizedItems.isEmpty()) {
                    merged.put(category, normalizedItems);
                }
            }
        }
        return merged;
    }

    private Map<String, List<String>> defaultCategoryKeywords() {
        Map<String, List<String>> keywords = new java.util.LinkedHashMap<>();
        keywords.put("payment", List.of("thanh toan", "payment", "giao dich", "refund", "hoan tien", "tru tien", "chua nhan ve", "zalopay", "momo", "vnpay", "the ngan hang"));
        keywords.put("account", List.of("tai khoan", "account", "login", "dang nhap", "dang ky", "otp", "mat khau", "quen mat khau", "khoa tai khoan", "profile"));
        keywords.put("promo", List.of("voucher", "khuyen mai", "promo", "ma giam gia", "uu dai", "coupon", "combo", "bap nuoc"));
        keywords.put("membership", List.of("hoi vien", "membership", "vip", "diem", "diem thuong", "tich diem", "hang thanh vien", "quyen loi"));
        keywords.put("ticket", List.of("ve", "ticket", "dat ve", "ma ve", "ma don", "suat chieu", "lich chieu", "ghe", "doi ve", "hoan ve", "huy ve", "phong chieu"));
        return keywords;
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
    }

    // Curse words that must be checked against ORIGINAL text (with diacritics)
    // because after normalization they collide with common Vietnamese words.
    // e.g. "cặc" (curse) normalizes to "cac" which collides with "các" (plural marker).
    private static final List<String> DIACRITIC_BANNED_WORDS = List.of(
            "cặc", "lồn", "địt", "đụ", "cứt", "đéo", "cặt", "lìn"
    );

    private boolean containsDiacriticBannedWord(String originalText) {
        if (originalText == null) return false;
        String lower = originalText.toLowerCase();
        // Strip punctuation for matching but keep diacritics
        String cleaned = lower.replaceAll("[^a-z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\\s]", " ")
                .replaceAll("\\s+", " ").trim();
        return DIACRITIC_BANNED_WORDS.stream()
                .anyMatch(word -> cleaned.matches(".*\\b" + java.util.regex.Pattern.quote(word) + "\\b.*"));
    }

    private boolean isGreetingOnly(String text) {
        String normalized = normalize(text).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        return normalized.matches("^(hi|hello|hey|xin chao|chao|chao ban|alo|hallo|good morning|good afternoon|good evening)$");
    }

    @SuppressWarnings("unchecked")
    private List<String> bannedWords() {
        try {
            Object nasaBot = systemConfigService.getConfig().get("nasaBot");
            if (nasaBot instanceof Map<?, ?> botMap) {
                Object words = ((Map<String, Object>) botMap).get("bannedWords");
                if (words instanceof List<?> items) {
                    List<String> normalizedWords = items.stream()
                            .filter(String.class::isInstance)
                            .map(String.class::cast)
                            .map(String::trim)
                            .filter(item -> !item.isBlank())
                            .toList();
                    if (!normalizedWords.isEmpty()) {
                        return normalizedWords;
                    }
                }
            }
        } catch (Exception ignored) {
            // fallback below
        }
        return defaultBannedWords();
    }

    private List<String> defaultBannedWords() {
        return List.of("dm", "dmm", "dit", "dit me", "du ma", "duma", "clm", "cc", "lon", "cai lon", "chui", "fuck", "shit", "bitch");
    }

    private boolean containsBannedWord(String text) {
        // Check diacritic-based banned words first (against original text)
        if (containsDiacriticBannedWord(text)) {
            return true;
        }
        String normalized = normalize(text).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return false;
        }
        return bannedWords().stream()
                .map(this::normalize)
                .map(word -> word.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim())
                .filter(word -> !word.isBlank())
                .anyMatch(word -> normalized.matches(".*\\b" + java.util.regex.Pattern.quote(word) + "\\b.*"));
    }
    private boolean isLowSignalMessage(String text) {
        String normalized = normalize(text).replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return true;
        }
        if (hasSupportKeyword(normalized)) {
            return false;
        }
        if (normalized.length() <= 2) {
            return true;
        }
        String compact = normalized.replace(" ", "");
        if (compact.length() >= 4 && compact.matches("(.)\\1{3,}")) {
            return true;
        }
        if (compact.length() >= 5 && compact.matches("[a-z]+") && !compact.matches(".*[aeiouy].*")) {
            return true;
        }
        // Only flag truly low-signal messages: pure gibberish patterns
        // "test", common abbreviations etc. are now allowed — bot will handle them naturally
        return normalized.matches("^(zzz+|asdf|qwer|qwerty)$");
    }
    private boolean hasSupportKeyword(String normalized) {
        return categoryKeywords().values().stream()
                .flatMap(List::stream)
                .map(this::normalize)
                .anyMatch(keyword -> normalized.matches(".*\\b" + java.util.regex.Pattern.quote(keyword) + "\\b.*"));
    }
    private SupportAiResult greetingReply() {
        return new SupportAiResult("Xin chào bạn! 👋 Mình là NASA BOT, trợ lý ảo của NASAFilm. Bạn cần mình hỗ trợ gì hôm nay ạ?", "other");
    }

    private SupportAiResult inappropriateReply() {
        return new SupportAiResult("Vui lòng nhắn nội dung phù hợp", "other");
    }
    private SupportAiResult unclearReply() {
        return new SupportAiResult("Mình chưa hiểu rõ nội dung bạn muốn hỗ trợ ạ. Bạn mô tả ngắn vấn đề liên quan đến vé, thanh toán, tài khoản, khuyến mãi hoặc hội viên giúp mình nhé.", "other");
    }
    @SuppressWarnings("unchecked")
    private String resolvePersonaPrompt() {
        try {
            Object nasaBot = systemConfigService.getConfig().get("nasaBot");
            if (nasaBot instanceof java.util.Map<?, ?> botMap) {
                Object prompt = ((java.util.Map<String, Object>) botMap).get("personaPrompt");
                if (prompt instanceof String text && !text.isBlank()) {
                    return text.trim();
                }
            }
        } catch (Exception ignored) {
            // fallback below
        }
        return """
                Bạn là NASA BOT, trợ lý hỗ trợ khách hàng chính thức của website NASAFilm — \
                nền tảng đặt vé xem phim trực tuyến hiện đại.\n\n\
                NGUYÊN TẮC PHẠM VI:\n\
                - Chỉ hỗ trợ các nội dung liên quan trực tiếp đến website NASAFilm, rạp phim và luồng nghiệp vụ trong dự án.\n\
                - Nếu khách hỏi ngoài lề dự án (kiến thức đời sống, học tập, lập trình, chính trị, y tế, pháp luật, tài chính cá nhân, giải trí ngoài NASAFilm, v.v.), \
                trả lời đúng một câu: "Câu hỏi không thuộc phạm vi hỗ trợ của Nasa."\n\
                - Không cố trả lời ngoài phạm vi, không giải thích dài, không chuyển chủ đề.\n\n\
                ═══════════════════════════════════════════\n\
                CÁC KỊCH BẢN TRONG PHẠM VI HỖ TRỢ:\n\
                ═══════════════════════════════════════════\n\n\
                【PHIM & DANH MỤC】\n\
                - Tìm phim, danh sách phim, phim đang chiếu, phim sắp chiếu.\n\
                - Chi tiết phim: thể loại, quốc gia, đạo diễn, diễn viên, độ tuổi giới hạn, thời lượng, ngày khởi chiếu.\n\
                - Trailer, poster, đánh giá phim (review + vibe tag), rating điểm.\n\
                - Duyệt phim theo thể loại (hành động, viễn tưởng, hoạt hình, kinh dị, tình cảm, hài...).\n\
                - Duyệt phim theo quốc gia sản xuất.\n\
                - Tìm kiếm phim theo tên, từ khóa.\n\
                - Movie Matchmaker: quiz gợi ý phim theo sở thích cá nhân trên trang chủ.\n\n\
                【SUẤT CHIẾU & RẠP】\n\
                - Lịch chiếu theo ngày, theo phim, theo rạp/cụm rạp.\n\
                - Định dạng chiếu: 2D (Phụ đề / Lồng tiếng), 3D, IMAX Laser, 4DX Motion, Dolby Atmos, ScreenX.\n\
                - Loại phòng chiếu: Standard, VIP Gold Class, IMAX.\n\
                - Sơ đồ ghế: ghế thường, ghế VIP, ghế couple, ghế đã đặt, ghế đang giữ.\n\
                - Giá vé theo loại ghế: vé thường, vé VIP, vé couple.\n\
                - Thời lượng phim + buffer trailer (10 phút).\n\n\
                【ĐẶT VÉ & CHỌN GHẾ】\n\
                - Quy trình đặt vé: chọn phim → chọn suất → chọn ghế → chọn combo → thanh toán → nhận vé QR.\n\
                - Giữ ghế tạm thời 5 phút khi nhấn "Tiến hành thanh toán", đồng hồ đếm ngược hiển thị trên giao diện.\n\
                - Mã vé, mã đơn hàng: định dạng TK-..., VE-..., OD-..., ORDER-..., TICKET-...\n\
                - QR vé: nhận qua email sau khi thanh toán thành công.\n\
                - Kích hoạt vé, vé không hiển thị, sai ghế, sai suất, sai phim, vé hết hạn.\n\
                - Đổi vé, hủy vé (xem thêm chính sách hủy bên dưới).\n\
                - Số ghế tối đa mỗi lần đặt: 8 ghế.\n\
                - PreShow Boarding: xem thông tin vé, đếm ngược đến giờ chiếu trước khi vào rạp.\n\n\
                【CHÍNH SÁCH HỦY VÉ & HOÀN TIỀN】\n\
                - Chỉ được hủy vé trước giờ chiếu tối thiểu 60 phút.\n\
                - Vé thuộc suất chiếu đã/sắp diễn ra trong vòng 60 phút → không thể hoàn hủy.\n\
                - Phí hủy vé: 10% giá trị vé (có cấu hình).\n\
                - Hoàn tiền: hệ thống hoàn điểm thưởng đã dùng, thu hồi điểm tích lũy của đơn, chuyển trạng thái đơn thành REFUNDED.\n\
                - Trường hợp rạp hủy suất chiếu: hoàn tiền 100%, không mất phí.\n\
                - Yêu cầu admin xác nhận thủ công đối với refund.\n\
                - Khách có thể yêu cầu hủy vé tại quầy counter với staff.\n\n\
                【THANH TOÁN】\n\
                - Phương thức: Ví điện tử (Momo, VNPay, ZaloPay), thẻ ngân hàng nội địa/quốc tế.\n\
                - Lỗi thanh toán, giao dịch pending, giao dịch thất bại.\n\
                - Bị trừ tiền nhưng chưa nhận vé → cần kiểm tra giao dịch và mã đơn.\n\
                - Đối soát giao dịch, yêu cầu hoàn tiền.\n\
                - Redirect về trang Payment Success / Payment Flow.\n\n\
                【TÀI KHOẢN】\n\
                - Đăng ký: email, họ tên, số điện thoại, mật khẩu (ít nhất 8 ký tự, có chữ hoa/thường/số/ký tự đặc biệt).\n\
                - Đăng nhập bằng email + mật khẩu, có "Ghi nhớ tài khoản".\n\
                - Đăng nhập Google OAuth.\n\
                - OTP xác thực tài khoản, kích hoạt tài khoản qua email.\n\
                - Quên mật khẩu → gửi mã khôi phục qua email → đặt lại mật khẩu.\n\
                - Đổi mật khẩu, cập nhật hồ sơ (họ tên, số điện thoại).\n\
                - Tài khoản bị khóa, tài khoản chưa xác thực.\n\
                - Xem điểm tích lũy, lịch sử đặt vé, lịch sử giao dịch.\n\n\
                【HỘI VIÊN & ĐIỂM THƯỞNG】\n\
                - 3 hạng thành viên dựa trên lifetime score:\n\
                  • NASA Member: hạng cơ bản, mặc định khi đăng ký.\n\
                  • NASA Friend (NASA'FRIEND): hạng trung cấp, nhiều ưu đãi hơn.\n\
                  • NASA VIP: hạng cao nhất, quyền lợi tối đa.\n\
                - Tỉ lệ tích điểm: 5% giá trị vé → quy đổi điểm (mặc định: mỗi 1,000đ chi tiêu = 1 điểm).\n\
                - Đổi điểm: 1 điểm = 1,000đ khi thanh toán.\n\
                - Điểm không được âm, điểm dùng tối đa bằng giá trị đơn hàng.\n\
                - Khi hủy vé: hoàn lại điểm đã dùng, thu hồi điểm dự kiến tích lũy.\n\
                - Xem lịch sử điểm, tiến độ lên hạng (còn bao nhiêu điểm để lên hạng tiếp theo).\n\n\
                【NHIỆM VỤ (MISSIONS) & BADGE】\n\
                - Hệ thống nhiệm vụ giúp người dùng khám phá và nhận thưởng:\n\
                  • EXPLORER: Đặt vé rạp hoặc VOD lần đầu để khám phá thể loại phim mới.\n\
                  • PREMIERE: Chọn phim vừa khởi chiếu và đặt vé trong 3 ngày đầu.\n\
                  • HYBRID_PILOT: Xem cùng một phim ở rạp VÀ mua thêm bản VOD.\n\
                  • SOCIAL_ORBIT: Tạo/tham gia phòng đặt vé nhóm (Orbit Room) qua trang chi tiết phim.\n\
                  • REVIEWER: Viết đánh giá có gắn vibe tag trên trang chi tiết phim.\n\
                  • MATCHMAKER_EXPLORER: Hoàn thành Movie Matchmaker quiz trên trang chủ.\n\
                - Mỗi nhiệm vụ có thể lặp lại: ONCE (1 lần), WEEKLY (hàng tuần), MONTHLY (hàng tháng).\n\
                - Badge / huy hiệu: nhận khi hoàn thành nhiệm vụ hoặc đạt mốc điểm.\n\
                - Campaign: chiến dịch nhiệm vụ theo mùa / sự kiện đặc biệt.\n\
                - Trạng thái nhiệm vụ: locked → available → in_progress → completed.\n\n\
                【PHÒNG ĐẶT VÉ NHÓM (ORBIT ROOMS)】\n\
                - Tạo phòng nhóm từ trang chi tiết phim, chọn suất chiếu.\n\
                - Mời bạn bè qua link chia sẻ, mã phòng.\n\
                - Cùng chọn ghế trong phòng nhóm (realtime qua WebSocket).\n\
                - Checkout chung: mỗi thành viên tự thanh toán phần vé của mình.\n\
                - Trạng thái phòng: chờ thành viên, đang chọn ghế, đã checkout, hết hạn.\n\n\
                【XEM PHIM ONLINE (VOD)】\n\
                - Mua vé xem phim online (VOD) trên trang chi tiết phim (nếu phim có hỗ trợ).\n\
                - Kích hoạt vé VOD, bắt đầu xem.\n\
                - Xem phim tại trang Watch.\n\
                - My Movies: danh sách phim đã mua VOD, thời hạn thuê.\n\
                - Hết hạn thuê VOD, gia hạn.\n\
                - Đồng hồ đếm ngược cảnh báo sắp hết thời gian xem.\n\n\
                【COMBO & BẮP NƯỚC (CONCESSIONS)】\n\
                - Đặt combo bắp nước kèm vé khi booking.\n\
                - Các loại combo có sẵn, giá từng loại.\n\
                - Thêm/sửa/xóa combo trước khi thanh toán.\n\n\
                【KHUYẾN MÃI & VOUCHER】\n\
                - Mã giảm giá (voucher code), coupon, ưu đãi.\n\
                - Điều kiện áp dụng: giá trị đơn tối thiểu, phim áp dụng, suất chiếu áp dụng.\n\
                - Voucher hết hạn, mã không hợp lệ, mã đã sử dụng.\n\
                - Combo khuyến mãi, ưu đãi theo hạng thành viên.\n\
                - Trang Offers: tổng hợp các chương trình khuyến mãi đang diễn ra.\n\n\
                【TICKET HỖ TRỢ】\n\
                - Tạo ticket hỗ trợ với 6 danh mục: Vé/Suất chiếu, Thanh toán, Tài khoản, Khuyến mãi, Hội viên, Khác.\n\
                - Xem trạng thái ticket (đang chờ, đang xử lý, đã hoàn thành).\n\
                - Thread chat với admin/staff trong ticket.\n\
                - Đánh giá mức độ hài lòng (1-5 sao) sau khi ticket hoàn thành.\n\
                - Chuyển ticket sang live support nếu cần xử lý gấp.\n\n\
                【LIVE SUPPORT】\n\
                - Gọi staff online để chat trực tiếp.\n\
                - Kiểm tra trạng thái staff có online không (realtime).\n\
                - Thời gian chờ, chuyển tiếp giữa các staff.\n\
                - Kết thúc phiên live chat, đánh giá hài lòng.\n\n\
                【WEBSITE & TÍNH NĂNG KHÁC】\n\
                - Wallet: ví điện tử tích hợp trong tài khoản NASAFilm.\n\
                - Reminders: nhắc lịch chiếu phim sắp tới.\n\
                - FAQ: câu hỏi thường gặp.\n\
                - Chính sách: điều khoản sử dụng, chính sách bảo mật, chính sách thanh toán, chính sách hoàn tiền.\n\
                - Counter (quầy): staff tại rạp có thể đặt vé trực tiếp cho khách, check-in vé bằng QR.\n\
                - Hướng dẫn sử dụng website, thao tác đặt vé, chọn ghế.\n\
                - Lỗi giao diện, không tải được trang, lỗi chọn ghế, lỗi xem phim online.\n\
                - Trang tìm kiếm, trang hồ sơ cá nhân.\n\n\
                ═══════════════════════════════════════════\n\
                QUY TẮC XỬ LÝ:\n\
                ═══════════════════════════════════════════\n\
                - Nếu nội dung có từ cấm/chửi tục/xúc phạm → chỉ trả lời: "Vui lòng nhắn nội dung phù hợp."\n\
                - Nếu người dùng chỉ chào hỏi → chào lại ngắn gọn, thân thiện và hỏi cần hỗ trợ gì trên NASAFilm.\n\
                - Nếu người dùng nói mơ hồ, không rõ vấn đề → hỏi lại đúng 1 câu ngắn để làm rõ.\n\
                - Nếu người dùng đã nêu rõ vấn đề → xác nhận lại vấn đề họ gặp và hỏi thông tin còn thiếu (mã vé, mã đơn, thời gian giao dịch, thông báo lỗi...).\n\
                - Nếu khách hỏi về chính sách → trả lời ngắn gọn, chính xác theo quy định NASAFilm.\n\
                - KHÔNG hỏi email hoặc số điện thoại (hệ thống đã tự động gắn tài khoản đăng nhập).\n\
                - KHÔNG tự bịa ra dữ liệu thực tế của hệ thống (đơn hàng, vé, thanh toán, điểm thưởng, trạng thái ticket, lịch chiếu...). \
                Nếu cần dữ liệu chính xác → yêu cầu khách kiểm tra trên website hoặc chờ admin.\n\
                - KHÔNG hứa chắc hoàn tiền / đổi vé nếu chưa có admin kiểm tra điều kiện.\n\
                - Nếu vấn đề cần người xử lý thực tế → hướng khách mô tả ngắn để tạo ticket hoặc gọi live support.\n\n\
                ═══════════════════════════════════════════\n\
                HƯỚNG DẪN LUỒNG TẠO TICKET HỖ TRỢ:\n\
                ═══════════════════════════════════════════\n\
                Khi khách cần tạo ticket, tuân thủ quy trình từng bước. SAU KHI THU THẬP ĐỦ THÔNG TIN VÀ KHÁCH XÁC NHẬN, BẠN PHẢI TỰ ĐỘNG TẠO TICKET — KHÔNG YÊU CẦU KHÁCH BẤM NÚT.\n\
                Khi khách xác nhận 'ok' / 'gửi' / 'chốt', kết thúc bằng câu:\n\
                "✅ Đã ghi nhận thắc mắc của bạn! Mình đang tạo ticket gửi admin... Admin sẽ phản hồi bạn trong thời gian sớm nhất."\n\
                Và hệ thống sẽ tự động tạo ticket. Bạn KHÔNG cần bảo khách bấm nút hay làm gì thêm.\n\n\
                1. Xác định danh mục: Vé/Suất chiếu, Thanh toán, Tài khoản, Khuyến mãi, Hội viên, hoặc Khác.\n\
                2. Thu thập thông tin TỪNG CÂU MỘT (không hỏi dồn nhiều câu):\n\
                   - Vé: mã vé/mã đơn → loại vấn đề (sai ghế/sai suất/sai phim/không thấy vé/đổi vé/hủy vé/khác) → mô tả chi tiết.\n\
                   - Thanh toán: mã đơn hàng → phương thức thanh toán (Momo/VNPay/ZaloPay/thẻ) → loại lỗi (trừ tiền chưa nhận vé/pending/thất bại/khác) → mô tả chi tiết.\n\
                   - Tài khoản: loại vấn đề (không đăng nhập được/quên MK/không nhận OTP/tài khoản bị khóa/khác) → bước bị lỗi → mô tả chi tiết.\n\
                   - Khuyến mãi: mã voucher → loại vấn đề (không áp dụng được/hết hạn/sai điều kiện/khác) → mô tả chi tiết.\n\
                   - Hội viên: loại vấn đề (không thấy điểm/sai hạng/không đổi được điểm/khác) → mô tả chi tiết.\n\
                   - Khác: mô tả trực tiếp vấn đề.\n\
                3. Sau khi đủ thông tin → hiển thị tóm tắt và hỏi xác nhận:\n\
                   "Bạn muốn chỉnh sửa thông tin nào không? Gõ 'sửa' để chỉnh hoặc 'ok' để gửi ticket."\n\
                4. Khi khách xác nhận 'ok' / 'gửi' / 'chốt' → hệ thống tự động tạo ticket, trả lời:\n\
                   "✅ Đã ghi nhận thắc mắc của bạn! Mình đang tạo ticket gửi admin... Admin sẽ phản hồi bạn trong thời gian sớm nhất."\n\n\
                ═══════════════════════════════════════════\n\
                PHONG CÁCH:\n\
                ═══════════════════════════════════════════\n\
                - Trả lời bằng tiếng Việt, lịch sự, thân thiện, chuyên nghiệp như nhân viên CSKH.\n\
                - Mỗi lượt tối đa 2-4 câu ngắn. Đi thẳng vào vấn đề, ưu tiên hành động tiếp theo.\n\
                - Phân loại nội dung theo từ khóa để backend tracking: ticket, payment, account, promo, membership, mission, orbit, vod, concessions, other.\n\
                - Khi thích hợp, gợi ý khách dùng nút shortcut có sẵn: "Vé / suất chiếu", "Thanh toán", "Tài khoản", "Khuyến mãi", "Hội viên".\
                """;
    }

    // ── AI Provider routing ──────────────────────────────────────────────

    private List<SupportAiMessage> buildMessages(String message, List<SupportAiMessage> history) {
        List<SupportAiMessage> messages = new ArrayList<>();
        messages.add(new SupportAiMessage("system", resolvePersonaPrompt()));
        if (history != null) {
            messages.addAll(history.stream()
                    .filter(item -> item != null && item.role() != null && item.content() != null)
                    .toList());
        }
        messages.add(new SupportAiMessage("user", message));
        return messages;
    }

    private boolean isGeminiConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }

    private boolean isGroqConfigured() {
        return groqApiKey != null && !groqApiKey.isBlank();
    }

    private boolean isOpenaiConfigured() {
        return openaiApiKey != null && !openaiApiKey.isBlank();
    }

    public boolean isConfigured() {
        return isGroqConfigured() || isGeminiConfigured() || isOpenaiConfigured();
    }

    public String getRuntimeMode() {
        if (isGroqConfigured()) return "GROQ";
        if (isGeminiConfigured()) return "GEMINI";
        if (isOpenaiConfigured()) return "OPENAI";
        return "FALLBACK";
    }

    // ── Gemini API call ──────────────────────────────────────────────────

    private SupportAiResult callGemini(List<SupportAiMessage> messages, String detectedCategory) {
        try {
            // Convert OpenAI-format messages to Gemini format
            List<Map<String, Object>> contents = new ArrayList<>();
            StringBuilder systemPrompt = new StringBuilder();
            for (SupportAiMessage m : messages) {
                if ("system".equals(m.role())) {
                    systemPrompt.append(m.content()).append("\n");
                } else {
                    String role = "assistant".equals(m.role()) ? "model" : "user";
                    Map<String, Object> content = Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", m.content()))
                    );
                    contents.add(content);
                }
            }

            // Build Gemini request body
            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("contents", contents);
            if (!systemPrompt.isEmpty()) {
                body.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", systemPrompt.toString().trim()))
                ));
            }
            body.put("generationConfig", Map.of(
                "maxOutputTokens", 512,
                "temperature", 0.7
            ));

            String payload = objectMapper.writeValueAsString(body);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) Thread.sleep(400L * attempt);
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .timeout(Duration.ofSeconds(20))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                            .build();

                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        String reply = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
                        if (reply != null && !reply.isBlank()) {
                            log.info("Gemini responded successfully");
                            return new SupportAiResult(reply.trim(), detectedCategory);
                        }
                    }
                    if (response.statusCode() >= 500) {
                        log.warn("Gemini server error {} on attempt {}/{}", response.statusCode(), attempt + 1, MAX_RETRIES + 1);
                        continue;
                    }
                    // 4xx or empty reply — don't retry, fall through to OpenAI
                    log.warn("Gemini returned {} — falling back to next provider", response.statusCode());
                    break;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    log.warn("Gemini call failed on attempt {}/{}: {}", attempt + 1, MAX_RETRIES + 1, e.getMessage());
                    if (attempt >= MAX_RETRIES) break;
                }
            }
        } catch (Exception e) {
            log.warn("Gemini provider failed: {}", e.getMessage());
        }
        return null; // Signal to try next provider
    }

    // ── Groq API call (primary — free, OpenAI-compatible) ────────────────

    private SupportAiResult callGroq(List<SupportAiMessage> messages, String detectedCategory) {
        try {
            // Groq is OpenAI-compatible — same payload format
            String payload = objectMapper.writeValueAsString(new OpenAiChatRequest(groqModel, messages));

            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) Thread.sleep(300L * attempt);
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                            .timeout(Duration.ofSeconds(20))
                            .header("Content-Type", "application/json")
                            .header("Authorization", "Bearer " + groqApiKey)
                            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                            .build();

                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        String reply = root.path("choices").path(0).path("message").path("content").asText(null);
                        if (reply != null && !reply.isBlank()) {
                            log.info("Groq responded successfully");
                            return new SupportAiResult(reply.trim(), detectedCategory);
                        }
                    }
                    if (response.statusCode() >= 500) {
                        log.warn("Groq server error {} on attempt {}/{}", response.statusCode(), attempt + 1, MAX_RETRIES + 1);
                        continue;
                    }
                    log.warn("Groq returned {} — falling back to next provider", response.statusCode());
                    break;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    log.warn("Groq call failed on attempt {}/{}: {}", attempt + 1, MAX_RETRIES + 1, e.getMessage());
                    if (attempt >= MAX_RETRIES) break;
                }
            }
        } catch (Exception e) {
            log.warn("Groq provider failed: {}", e.getMessage());
        }
        return null; // Signal to try next provider
    }

    // ── OpenAI API call (fallback from Gemini) ───────────────────────────

    private SupportAiResult callOpenAI(List<SupportAiMessage> messages, String detectedCategory) {
        try {
            String payload = objectMapper.writeValueAsString(new OpenAiChatRequest(openaiModel, messages));

            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) Thread.sleep(300L * attempt);
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                            .timeout(Duration.ofSeconds(25))
                            .header("Content-Type", "application/json")
                            .header("Authorization", "Bearer " + openaiApiKey)
                            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                            .build();

                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        String reply = root.path("choices").path(0).path("message").path("content").asText(null);
                        if (reply != null && !reply.isBlank()) {
                            log.info("OpenAI responded successfully");
                            return new SupportAiResult(reply.trim(), detectedCategory);
                        }
                    }
                    if (response.statusCode() >= 500) {
                        log.warn("OpenAI server error {} on attempt {}/{}", response.statusCode(), attempt + 1, MAX_RETRIES + 1);
                        continue;
                    }
                    log.warn("OpenAI returned {} — skipping retry", response.statusCode());
                    break;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    log.warn("OpenAI call failed on attempt {}/{}: {}", attempt + 1, MAX_RETRIES + 1, e.getMessage());
                    if (attempt >= MAX_RETRIES) break;
                }
            }
        } catch (Exception e) {
            log.warn("OpenAI provider failed: {}", e.getMessage());
        }
        return null; // Signal to fall back to rule-based
    }

    public record SupportAiMessage(String role, String content) {}
    public record SupportAiResult(String reply, String suggestedCategory, String flowState, TicketAction ticketAction) {
        public SupportAiResult(String reply, String suggestedCategory) {
            this(reply, suggestedCategory, null, null);
        }
        public SupportAiResult(String reply, String suggestedCategory, String flowState) {
            this(reply, suggestedCategory, flowState, null);
        }
        public SupportAiResult withTicketAction(TicketAction action) {
            return new SupportAiResult(reply, suggestedCategory, flowState, action);
        }
    }
    public record TicketAction(String category, String description, String summary) {}

    private record OpenAiChatRequest(String model, List<SupportAiMessage> messages) {}
}
