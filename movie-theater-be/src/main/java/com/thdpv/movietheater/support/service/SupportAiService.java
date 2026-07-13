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
import java.util.concurrent.atomic.AtomicLong;

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
    /** Skip OpenAI until this epoch-ms after a 429 (quota / rate limit). */
    private static final long OPENAI_COOLDOWN_MS = 5 * 60 * 1000L;
    private final AtomicLong openaiCooldownUntilMs = new AtomicLong(0);
    private final java.util.concurrent.atomic.AtomicReference<List<String>> lastProviderFailures =
            new java.util.concurrent.atomic.AtomicReference<>(List.of());

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

    @jakarta.annotation.PostConstruct
    void logProviderStatus() {
        log.info("Support AI providers — Groq={}, Gemini={}, OpenAI={}, runtimeMode={}",
                isGroqConfigured(), isGeminiConfigured(), isOpenaiConfigured(), getRuntimeMode());
    }

    public SupportAiResult chat(String message, List<SupportAiMessage> history) {
        return chat(message, history, null);
    }

    /**
     * @param mode {@code ANSWER} = free AI for every message (Giải đáp);
     *             otherwise support/guided flow for ticket categories.
     */
    public SupportAiResult chat(String message, List<SupportAiMessage> history, String mode) {
        boolean answerMode = isAnswerMode(mode);
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
            if (answerMode) {
                return new SupportAiResult(
                    "Hiện AI chưa được cấu hình. Thêm APP_OPENAI_API_KEY (hoặc Groq/Gemini) vào .env rồi khởi động lại backend nhé.",
                    "other");
            }
            if (hasTicketOrOrderCode(message)) {
                String reply = "Mình đã nhận mã " + extractTicketOrOrderCode(message) + ". "
                    + "Bạn cho mình biết mã này đang gặp lỗi gì: sai vé, chưa nhận vé, cần đổi/hủy/hoàn vé hay lỗi quét QR để admin kiểm tra đúng hướng nhé.";
                return new SupportAiResult(reply, "ticket");
            }
            return fallback(message, history);
        }

        // Support mode: ticket-related categories use guided form (no AI)
        if (!answerMode && isGuidedCategory(detectedCategory)) {
            return fallback(message, history);
        }

        try {
            List<SupportAiMessage> messages = buildMessages(message, history, answerMode);
            SupportAiResult aiResult = invokeConfiguredProviders(messages, detectedCategory);

            if (aiResult != null) {
                return answerMode ? aiResult : postProcessAiResult(aiResult, message, history);
            }

            if (answerMode) {
                return new SupportAiResult(buildAllProvidersFailedReply(), "other");
            }
            return fallback(message, history);
        } catch (Exception error) {
            log.error("Unexpected error in AI chat flow", error);
            if (answerMode) {
                return new SupportAiResult(
                    "Có lỗi khi gọi AI. Bạn thử lại sau hoặc chuyển sang mục Hỗ trợ nhé.",
                    "other");
            }
            return fallback(message, history);
        }
    }

    /**
     * Free-tier first (Groq → Gemini), then OpenAI — unless OpenAI is in 429 cooldown.
     */
    private SupportAiResult invokeConfiguredProviders(List<SupportAiMessage> messages, String detectedCategory) {
        lastProviderFailures.set(new ArrayList<>());
        SupportAiResult aiResult = null;
        if (isGroqConfigured()) {
            aiResult = callGroq(messages, detectedCategory);
            if (aiResult == null) {
                noteProviderFailure("Groq");
            }
        }
        if (aiResult == null && isGeminiConfigured()) {
            aiResult = callGemini(messages, detectedCategory);
            if (aiResult == null) {
                noteProviderFailure("Gemini");
            }
        }
        if (aiResult == null && isOpenaiConfigured() && !isOpenaiCoolingDown()) {
            aiResult = callOpenAI(messages, detectedCategory);
            if (aiResult == null) {
                noteProviderFailure("OpenAI");
            }
        } else if (aiResult == null && isOpenaiConfigured() && isOpenaiCoolingDown()) {
            noteProviderFailure("OpenAI(429 cooldown)");
        }
        return aiResult;
    }

    private void noteProviderFailure(String label) {
        lastProviderFailures.updateAndGet(list -> {
            List<String> next = new ArrayList<>(list);
            next.add(label);
            return next;
        });
    }

    private boolean isOpenaiCoolingDown() {
        return System.currentTimeMillis() < openaiCooldownUntilMs.get();
    }

    private void markOpenaiRateLimited() {
        openaiCooldownUntilMs.set(System.currentTimeMillis() + OPENAI_COOLDOWN_MS);
        log.warn("OpenAI entered {}s cooldown after rate limit", OPENAI_COOLDOWN_MS / 1000);
    }

    private String buildAllProvidersFailedReply() {
        List<String> fails = lastProviderFailures.get();
        StringBuilder sb = new StringBuilder("Mình chưa gọi được AI lúc này. ");
        if (fails != null && !fails.isEmpty()) {
            sb.append("Provider lỗi: ").append(String.join(", ", fails)).append(". ");
        }
        if (!isGroqConfigured()) {
            sb.append("Chưa có APP_GROQ_API_KEY trong runtime — kiểm tra .env và restart backend. ");
        }
        sb.append("OpenAI/Gemini 429 thường do hết quota (free hoặc chưa billing). Groq free thường vẫn dùng được nếu key đã load. ");
        sb.append("Hoặc chuyển sang mục Hỗ trợ để tạo ticket.");
        return sb.toString().trim();
    }

    private boolean isAnswerMode(String mode) {
        return mode != null && "ANSWER".equalsIgnoreCase(mode.trim());
    }

    /** Categories that use guided form flow instead of AI. */
    private boolean isGuidedCategory(String category) {
        return !"other".equals(category);
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
            "🔄 Bạn đang bị lỗi ở bước nào? (Ví dụ: nhập OTP, nhập mật khẩu, xác thực email, đăng nhập Google...)",
            "📝 Ghi email đăng ký, thông báo lỗi trên màn hình và thời gian phát sinh để admin kiểm tra."
        },
        "promo", new String[]{
            "🎁 Bạn vui lòng nhập **mã voucher** hoặc tên **chương trình khuyến mãi** gặp lỗi giúp mình.",
            "⚠️ Vấn đề bạn gặp với mã này là gì?\n• Không áp dụng được khi thanh toán\n• Mã đã hết hạn\n• Không đúng điều kiện áp dụng\n• Combo bắp nước không giảm giá\n• Khác (mô tả thêm)",
            "📝 Ghi mã đơn liên quan, thông báo lỗi và thời điểm áp dụng để admin kiểm tra."
        },
        "membership", new String[]{
            "👑 Bạn gặp vấn đề gì về hội viên?\n• Điểm thưởng chưa được cộng / bị sai\n• Hạng thành viên không đúng\n• Quyền lợi hội viên không được áp dụng\n• Khác (mô tả thêm)",
            "📝 Ghi mã đơn liên quan, số điểm/hạng hiện tại và thời điểm phát sinh để admin kiểm tra."
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

        // If current message doesn't match a category, look at conversation history
        if ("other".equals(category)) {
            String historyCategory = detectCategoryFromHistory(history);
            if (historyCategory != null && !"other".equals(historyCategory)) {
                return guidedFlowReply(message, normalized, historyCategory, history);
            }
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

    /** Detect category from conversation history (look at last bot message or first user message). */
    private String detectCategoryFromHistory(List<SupportAiMessage> history) {
        if (history == null) return null;
        // Check last bot message for category context
        for (int i = history.size() - 1; i >= 0; i--) {
            SupportAiMessage m = history.get(i);
            if ("assistant".equals(m.role()) || "bot".equals(m.role())) {
                String cat = detectCategory(m.content());
                if (!"other".equals(cat)) return cat;
            }
        }
        // Fallback: check first user message in history
        for (SupportAiMessage m : history) {
            if ("user".equals(m.role())) {
                String cat = detectCategory(m.content());
                if (!"other".equals(cat)) return cat;
            }
        }
        return null;
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
            if (containsAnyToken(normalized, CONFIRM_EDIT) || (lastBotMsg != null && (normalized.contains("chinh sua") || normalized.contains("chỉnh sửa")))) {
                // User wants to edit → restart the flow from field 1
                return new SupportAiResult(
                    "✅ Mình hiểu, bạn muốn chỉnh sửa thông tin. Mình sẽ hỏi lại từ đầu nhé.\n\n" + prompts[0],
                    category, "collecting", null
                );
            }
            if (containsAnyToken(normalized, CONFIRM_YES)) {
                // User confirmed → finalize with auto ticket creation
                String summary = buildSummary(category, message, history);
                String description = buildDescription(category, message, history);
                String ticketInfo = "📋 **Tóm tắt ticket:**\n" + summary;
                return new SupportAiResult(
                    "✅ Đã ghi nhận thắc mắc của bạn! Mình đang tạo ticket gửi admin...\n" + ticketInfo
                    + "\n\n⏳ Admin sẽ phản hồi bạn trong thời gian sớm nhất.",
                    category, "finalizing"
                ).withTicketAction(new TicketAction(category, description, summary));
            }
            // Ambiguous response — ask again with choice buttons
            return new SupportAiResult(
                "Mình chưa rõ ý bạn. Bạn chọn giúp mình nhé:",
                category, "confirming",
                List.of(
                    new ChoiceButton("✏️ Chỉnh sửa", "edit"),
                    new ChoiceButton("✅ OK — Gửi ticket", "ok")
                )
            );
        }

        // ── State: All fields collected, move to confirmation ──
        if (fieldsCollected >= totalFields) {
            String summary = buildSummary(category, message, history);
            return new SupportAiResult(
                "📋 Mình đã tổng hợp thông tin ticket của bạn như sau:\n\n" + summary
                + "\n\nBạn kiểm tra lại thông tin rồi chọn bên dưới nhé:",
                category, "confirming",
                List.of(
                    new ChoiceButton("✏️ Chỉnh sửa", "edit"),
                    new ChoiceButton("✅ OK — Gửi ticket", "ok")
                )
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

        // Add choice buttons for the 2nd field (issueType) for each category
        List<ChoiceButton> choices = getChoicesForField(category, nextFieldIndex);

        return new SupportAiResult(sb.toString(), category, "collecting", choices);
    }

    /** Return quick-reply choice buttons for the given category and field index. */
    private List<ChoiceButton> getChoicesForField(String category, int fieldIndex) {
        if (fieldIndex == 1) { // second question = issue type
            return switch (category) {
                case "ticket" -> List.of(
                    new ChoiceButton("🎫 Sai ghế / suất / phim", "Sai ghế/suất/phim"),
                    new ChoiceButton("📭 Chưa nhận được vé", "Chưa nhận vé"),
                    new ChoiceButton("🔄 Cần đổi / hủy / hoàn vé", "Đổi/hủy vé"),
                    new ChoiceButton("📱 Lỗi quét mã QR", "Lỗi QR"),
                    new ChoiceButton("📝 Khác", "Khác")
                );
                case "payment" -> List.of(
                    new ChoiceButton("💸 Bị trừ tiền nhưng chưa nhận vé", "Trừ tiền chưa nhận vé"),
                    new ChoiceButton("↩️ Cần hoàn tiền / refund", "Hoàn tiền"),
                    new ChoiceButton("⏱️ Giao dịch bị lỗi / timeout", "Giao dịch lỗi"),
                    new ChoiceButton("📝 Khác", "Khác")
                );
                case "account" -> List.of(
                    new ChoiceButton("🔑 Không đăng nhập được", "Không đăng nhập được"),
                    new ChoiceButton("📱 Không nhận được OTP", "Không nhận OTP"),
                    new ChoiceButton("🔒 Quên mật khẩu", "Quên mật khẩu"),
                    new ChoiceButton("🚫 Tài khoản bị khóa", "Tài khoản bị khóa"),
                    new ChoiceButton("✏️ Cập nhật thông tin", "Cập nhật thông tin"),
                    new ChoiceButton("📝 Khác", "Khác")
                );
                case "promo" -> List.of(
                    new ChoiceButton("❌ Không áp dụng được", "Không áp dụng được"),
                    new ChoiceButton("⏰ Mã đã hết hạn", "Mã hết hạn"),
                    new ChoiceButton("📋 Không đúng điều kiện", "Không đúng điều kiện"),
                    new ChoiceButton("📝 Khác", "Khác")
                );
                case "membership" -> List.of(
                    new ChoiceButton("⭐ Điểm thưởng bị sai", "Điểm thưởng sai"),
                    new ChoiceButton("👑 Hạng thành viên không đúng", "Hạng thành viên sai"),
                    new ChoiceButton("🎁 Quyền lợi không được áp dụng", "Quyền lợi không áp dụng"),
                    new ChoiceButton("📝 Khác", "Khác")
                );
                default -> null;
            };
        }
        // Payment step 2 (paymentMethod) — show payment method choices
        if ("payment".equals(category) && fieldIndex == 1) {
            return List.of(
                new ChoiceButton("💸 Bị trừ tiền nhưng chưa nhận vé", "Trừ tiền chưa nhận vé"),
                new ChoiceButton("↩️ Cần hoàn tiền / refund", "Hoàn tiền"),
                new ChoiceButton("⏱️ Giao dịch bị lỗi / timeout", "Giao dịch lỗi"),
                new ChoiceButton("📝 Khác", "Khác")
            );
        }
        return null;
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
        return new SupportAiResult("👋 Chào bạn! Mình có thể giúp gì cho bạn hôm nay?", "other");
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
                Bạn là NASA BOT, trợ lý khách hàng chính thức của website đặt vé xem phim NASAFilm.\n\n\
                VAI TRÒ CỦA BẠN: Trả lời các câu hỏi CHUNG về NASAFilm — phim, rạp, suất chiếu, chính sách, \
                tính năng website, hướng dẫn sử dụng. Bạn KHÔNG thu thập thông tin để tạo ticket hỗ trợ \
                (hệ thống tự xử lý luồng đó).\n\n\
                PHẠM VI:\n\
                - Chỉ trả lời nội dung liên quan NASAFilm.\n\
                - Ngoài phạm vi → trả lời: "Câu hỏi không thuộc phạm vi hỗ trợ của Nasa."\n\n\
                KIẾN THỨC VỀ NASAFILM:\n\
                - Phim: đang chiếu, sắp chiếu, thể loại, quốc gia, đạo diễn, diễn viên, độ tuổi, thời lượng, \
                trailer, review + vibe tag, Movie Matchmaker quiz.\n\
                - Suất chiếu & Rạp: 2D/3D/IMAX/4DX/Dolby/ScreenX, Standard/VIP/IMAX, \
                ghế thường/VIP/couple, thời lượng + 10 phút buffer trailer.\n\
                - Đặt vé: chọn phim → suất → ghế → combo → thanh toán → QR. Giữ ghế 5 phút. Tối đa 8 ghế/lần.\n\
                - Chính sách hủy: trước giờ chiếu 60 phút, phí 10%. Rạp hủy suất → hoàn 100%.\n\
                - Thanh toán: Momo, VNPay, ZaloPay, thẻ NH.\n\
                - Tài khoản: đăng ký, đăng nhập, Google OAuth, OTP email 6 số, quên MK, kích hoạt tài khoản, khóa/mở khóa.\n\
                - Hội viên: NASA Member (0), NASA Friend (≥5.000 lifetime), NASA VIP (≥10.000 lifetime). \
                Tích điểm floor(tổng tiền thực trả/10.000đ). 1 điểm = 1,000đ. Giảm combo Friend 10%, VIP 15%.\n\
                - Missions: EXPLORER, PREMIERE, HYBRID_PILOT, SOCIAL_ORBIT, REVIEWER, MATCHMAKER_EXPLORER. \
                ONCE/WEEKLY/MONTHLY. Badge, campaign.\n\
                - Orbit Rooms: đặt vé nhóm realtime, mời bạn, checkout riêng.\n\
                - VOD: mua/xem online, My Movies, đồng hồ đếm ngược.\n\
                - Concessions: combo bắp nước đặt kèm vé.\n\
                - Khuyến mãi: voucher, coupon, điều kiện áp dụng, trang Offers, voucher đổi điểm.\n\
                - Ticket hỗ trợ & Live Support: tạo ticket, chat admin/staff, gọi staff online.\n\
                - Wallet, Reminders, FAQ, PreShow Boarding, Counter, check-in QR.\n\n\
                FAQ HỖ TRỢ THEO DANH MỤC (trả lời ngắn, chính xác):\n\n\
                👤 TÀI KHOẢN — đăng nhập, OTP, mật khẩu:\n\
                - Quên MK: trang Quên mật khẩu → email → link reset (kiểm tra spam).\n\
                - OTP đăng ký: gửi qua email, có cooldown, sai nhiều lần có thể khóa tạm.\n\
                - Đăng nhập: email + MK hoặc Google OAuth; cần kích hoạt tài khoản.\n\
                - Profile: cập nhật họ tên, SĐT; MK tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt).\n\n\
                🎁 KHUYẾN MÃI — voucher, combo, mã giảm giá:\n\
                - Nhập mã ở bước thanh toán; voucher đổi điểm phải đổi trong Offers trước.\n\
                - Lỗi thường gặp: hết hạn, chưa đủ hạng, hết lượt, chưa đổi điểm kích hoạt.\n\
                - Combo: Friend giảm 10%, VIP giảm 15% (theo lifetimeScore).\n\n\
                👑 HỘI VIÊN — điểm, hạng, quyền lợi:\n\
                - Tích điểm: floor(tổng tiền thực trả / 10.000đ) sau thanh toán thành công.\n\
                - Hạng (lifetimeScore): Member 0 · Friend ≥5.000 · VIP ≥10.000.\n\
                - Quy đổi: 1 điểm = 1.000đ; hoàn/hủy vé điều chỉnh điểm tương ứng.\n\n\
                Khi FAQ không giải quyết được → hướng khách chọn danh mục phù hợp trên widget và mô tả chi tiết \
                (email, mã đơn, thông báo lỗi, thời gian).\n\n\
                QUY TẮC:\n\
                - Nội dung chửi tục/xúc phạm → "Vui lòng nhắn nội dung phù hợp."\n\
                - Chào hỏi → chào lại ngắn + hỏi cần hỗ trợ gì.\n\
                - Mơ hồ → hỏi 1 câu làm rõ.\n\
                - Hỏi chính sách → trả lời ngắn gọn, chính xác.\n\
                - KHÔNG bịa dữ liệu (đơn hàng, vé, điểm, lịch chiếu...). Không hỏi email/SĐT.\n\
                - KHÔNG hứa hoàn tiền/đổi vé nếu chưa có admin kiểm tra.\n\
                - KHÔNG tự ý tạo ticket hay thu thập thông tin ticket (hệ thống có luồng riêng). \
                Nếu khách cần hỗ trợ vé/thanh toán/tài khoản/khuyến mãi/hội viên → \
                chỉ cần xác nhận đã hiểu vấn đề và nói: \
                "Mình sẽ mở form hỗ trợ cho bạn. Bạn làm theo từng bước nhé!"\n\n\
                PHONG CÁCH:\n\
                - Tiếng Việt, lịch sự, thân thiện.\n\
                - 2-4 câu ngắn/lượt.\
                """;
    }

    // ── AI Provider routing ──────────────────────────────────────────────

    private List<SupportAiMessage> buildMessages(String message, List<SupportAiMessage> history, boolean answerMode) {
        List<SupportAiMessage> messages = new ArrayList<>();
        String persona = resolvePersonaPrompt();
        if (answerMode) {
            persona = persona + "\n\nCHẾ ĐỘ GIẢI ĐÁP: Trả lời mọi câu hỏi liên quan NASAFilm bằng kiến thức sẵn có. "
                + "Không mở luồng thu thập ticket. Nếu khách cần tạo ticket/gặp nhân viên, "
                + "hãy bảo họ chọn mục Hỗ trợ trên widget.";
        }
        messages.add(new SupportAiMessage("system", persona));
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
            // Auth via header — required for newer Google AI Studio keys (AQ.…); avoid putting key in URL.
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + geminiModel + ":generateContent";

            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) Thread.sleep(400L * attempt);
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .timeout(Duration.ofSeconds(20))
                            .header("Content-Type", "application/json")
                            .header("x-goog-api-key", geminiApiKey.trim())
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
                    log.warn("Gemini returned {} — falling back to next provider. bodySnippet={}",
                            response.statusCode(),
                            response.body() == null ? "" : response.body().substring(0, Math.min(180, response.body().length())));
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
                    if (response.statusCode() == 429) {
                        markOpenaiRateLimited();
                        log.warn("OpenAI returned 429 — cooling down, try next provider");
                        break;
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
    public record ChoiceButton(String text, String value) {}
    public record SupportAiResult(String reply, String suggestedCategory, String flowState, TicketAction ticketAction, List<ChoiceButton> choices) {
        public SupportAiResult(String reply, String suggestedCategory) {
            this(reply, suggestedCategory, null, null, null);
        }
        public SupportAiResult(String reply, String suggestedCategory, String flowState) {
            this(reply, suggestedCategory, flowState, null, null);
        }
        public SupportAiResult(String reply, String suggestedCategory, String flowState, List<ChoiceButton> choices) {
            this(reply, suggestedCategory, flowState, null, choices);
        }
        public SupportAiResult withTicketAction(TicketAction action) {
            return new SupportAiResult(reply, suggestedCategory, flowState, action, choices);
        }
        public SupportAiResult withChoices(List<ChoiceButton> c) {
            return new SupportAiResult(reply, suggestedCategory, flowState, ticketAction, c);
        }
    }
    public record TicketAction(String category, String description, String summary) {}

    private record OpenAiChatRequest(String model, List<SupportAiMessage> messages) {}
}
