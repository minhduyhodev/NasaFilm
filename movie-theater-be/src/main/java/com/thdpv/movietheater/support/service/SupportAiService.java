package com.thdpv.movietheater.support.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    /** Reasoning models (DeepSeek-R1, Qwen3, …) may leak CoT inside these tags. */
    private static final Pattern THINK_BLOCK = Pattern.compile(
            "(?is)<\\s*(?:think|thinking|reasoning)\\s*>.*?<\\s*/\\s*(?:think|thinking|reasoning)\\s*>");
    private static final Pattern THINK_OPEN_UNCLOSED = Pattern.compile(
            "(?is)<\\s*(?:think|thinking|reasoning)\\s*>.*");
    private static final Pattern THINK_HEADING = Pattern.compile(
            "(?im)^\\s*(?:thinking\\s*process|chain\\s*of\\s*thought)\\s*:?\\s*");

    /**
     * Default NASA BOT persona (used when admin has not overridden it in system_config).
     * Kept identical to {@code SystemConfigService.defaultNasaBotConfig()} so every machine
     * behaves the same. The key rule: always answer phim/suất/rạp/giá from the live
     * "DỮ LIỆU THỰC TẾ" snapshot instead of guessing.
     */
    static final String DEFAULT_PERSONA_PROMPT = """
            Bạn là NASA BOT — trợ lý ảo chính thức của NASAFilm (website đặt vé và xem phim).

            🎯 VAI TRÒ
            Giải đáp thân thiện, chính xác các thắc mắc CHUNG về NASAFilm: phim, suất chiếu, rạp, giá vé,
            combo bắp nước, khuyến mãi, hội viên, cách đặt vé và cách dùng website. Bạn KHÔNG tự thu thập
            thông tin để tạo ticket — hệ thống đã có luồng "Hỗ trợ" riêng cho việc đó.

            📊 CÁCH DÙNG DỮ LIỆU (QUAN TRỌNG NHẤT)
            - Với câu hỏi về phim đang chiếu / sắp chiếu, suất chiếu, rạp, giá, combo, voucher, mission…:
              LUÔN đọc và trả lời DỰA TRÊN khối "DỮ LIỆU THỰC TẾ WEBSITE NASAFILM" được cấp trong hội thoại.
            - Nếu thông tin KHÔNG có trong khối dữ liệu đó → nói thật là hiện chưa có và mời khách xem trang
              tương ứng (Phim, Lịch chiếu, Offers, Missions). TUYỆT ĐỐI không bịa tên phim, suất, giá hay mã.
            - Khi có khối "KHÁCH ĐANG ĐĂNG NHẬP" → dùng đúng điểm/hạng của khách đó; không suy đoán cho người khác.

            🔒 PHẠM VI
            - Ưu tiên nội dung liên quan NASAFilm.
            - Câu hỏi ngoài lề (đồ ăn, thời tiết, đời sống…) → KHÔNG từ chối thẳng thừng; trả lời hài hước, duyên dáng
              rồi khéo léo lái chủ đề về đặt vé / xem phim / bắp nước tại NASAFilm
              (ví dụ: "Thay vì đi ăn gà, bạn ghé NASAFilm nhâm nhi bắp nước xem một bộ phim bom tấn nhé?").

            📚 KIẾN THỨC NỀN (dùng khi không có dữ liệu realtime)
            - Đặt vé: chọn phim → suất → ghế → combo → thanh toán → mã QR. Giữ ghế trong thời gian quy định,
              tối đa 8 ghế mỗi lần.
            - Định dạng: 2D/3D/IMAX/4DX/Dolby/ScreenX; ghế Thường/VIP/Couple.
            - Thanh toán: MoMo, VNPay, ZaloPay, thẻ ngân hàng, ví NASA, tại quầy.
            - Tài khoản: đăng ký, đăng nhập, Google OAuth, OTP email, quên/đổi mật khẩu, kích hoạt, khóa/mở khóa.
            - Hội viên: Member (0) · Friend (≥5.000 lifetime) · VIP (≥10.000 lifetime); combo giảm 10% (Friend) / 15% (VIP).
            - Khuyến mãi: nhập mã ở bước thanh toán; voucher đổi điểm phải đổi trong Offers trước;
              lỗi hay gặp: hết hạn, chưa đủ hạng, hết lượt.
            - Ngoài ra còn có: VOD (xem online), Orbit Rooms (đặt nhóm), Missions, Ví NASA, Reminders, check-in QR.

            🤝 KHI KHÁCH CẦN NHÂN VIÊN
            Nếu khách gặp sự cố cụ thể về vé/thanh toán/tài khoản/khuyến mãi/hội viên cần người kiểm tra →
            xác nhận đã hiểu vấn đề rồi mời khách chuyển sang tab "Hỗ trợ" trên widget. KHÔNG hỏi email/SĐT,
            KHÔNG hứa hoàn tiền/đổi vé thay admin.

            🎨 TRÌNH BÀY (bố cục gọn, dễ đọc, có link phim)
            - Khi liệt kê phim/suất/combo/voucher: MỖI mục MỘT DÒNG, bắt đầu bằng "• " và XUỐNG DÒNG rõ ràng.
              KHÔNG dồn tất cả vào một đoạn văn dài.
            - Bố cục gợi ý: 1 câu mở đầu ngắn → danh sách gạch đầu dòng → 1 câu hỏi chốt.
            - Ghi ĐÚNG NGUYÊN VĂN tên phim như trong "DỮ LIỆU THỰC TẾ" (không dịch, không rút gọn, không thêm bớt)
              để hệ thống tự gắn link cho khách bấm mở trang phim. Bạn KHÔNG tự chèn URL hay mã UUID.

            💬 PHONG CÁCH TRẢ LỜI
            - Tiếng Việt, ấm áp, lịch sự, đi thẳng vào vấn đề.
            - Câu hỏi thường: 2–4 câu; khi liệt kê nhiều mục thì dùng danh sách gạch đầu dòng cho dễ đọc.
            - Chào hỏi → chào lại ngắn gọn rồi hỏi cần giúp gì. Câu mơ hồ → hỏi lại 1 câu cho rõ.
            - Chỉ xuất câu trả lời cuối cùng cho khách. KHÔNG viết bước suy nghĩ / Thinking Process,
              không dùng thẻ <think>, <thinking>, <reasoning>.""";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();
    private final ObjectMapper objectMapper;
    private final SystemConfigService systemConfigService;
    private final SupportAiContextService supportAiContextService;

    @Value("${app.groq.api-key}")
    private String groqApiKey;

    @Value("${app.groq.model}")
    private String groqModel;

    @Value("${app.groq.api-url}")
    private String groqApiUrl;

    public SupportAiService(
            ObjectMapper objectMapper,
            SystemConfigService systemConfigService,
            SupportAiContextService supportAiContextService) {
        this.objectMapper = objectMapper;
        this.systemConfigService = systemConfigService;
        this.supportAiContextService = supportAiContextService;
    }

    @jakarta.annotation.PostConstruct
    void logProviderStatus() {
        log.info("Support AI ready={} runtimeMode={}", isConfigured(), getRuntimeMode());
    }

    public SupportAiResult chat(String message, List<SupportAiMessage> history) {
        return chat(message, history, null, null);
    }

    public SupportAiResult chat(String message, List<SupportAiMessage> history, String mode) {
        return chat(message, history, mode, null);
    }

    /**
     * @param mode {@code ANSWER} = free AI for every message (Giải đáp);
     *             otherwise support/guided flow for ticket categories.
     * @param userEmail logged-in customer email for personal score/tier context (nullable).
     */
    public SupportAiResult chat(String message, List<SupportAiMessage> history, String mode, String userEmail) {
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
                    "Hiện AI chưa được cấu hình. Liên hệ admin kiểm tra cấu hình backend rồi thử lại nhé.",
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
        // Short confirm/edit replies ("ok", "sửa"…) from the guided buttons carry no
        // category of their own — keep them in the guided flow (so "OK — Gửi ticket"
        // finalizes the ticket) instead of routing to the free LLM, as long as the
        // conversation history is already inside a ticket category.
        if (!answerMode) {
            String norm = normalize(message).trim();
            if (CONFIRM_YES.contains(norm) || CONFIRM_EDIT.contains(norm)) {
                String historyCategory = detectCategoryFromHistory(history);
                if (historyCategory != null && isGuidedCategory(historyCategory)) {
                    return fallback(message, history);
                }
            }
        }

        try {
            List<SupportAiMessage> messages = buildMessages(message, history, answerMode, userEmail);
            SupportAiResult aiResult = callAi(messages, detectedCategory);

            if (aiResult != null) {
                return answerMode ? linkifyMovieReply(aiResult) : postProcessAiResult(aiResult, message, history);
            }

            if (answerMode) {
                return new SupportAiResult(
                    "Mình chưa gọi được AI lúc này. Bạn thử lại sau hoặc chuyển sang mục Hỗ trợ để tạo ticket nhé.",
                    "other");
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

    /**
     * Turn plain movie titles in a Giải đáp reply into markdown links
     * ({@code [Tên phim](/movie/uuid)}) so the frontend can render a clickable
     * shortcut to that movie's detail page. Titles + UUIDs come from the live
     * catalog, so links are always valid even if the model can't copy UUIDs.
     */
    private SupportAiResult linkifyMovieReply(SupportAiResult result) {
        if (result == null) {
            return null;
        }
        String reply = result.reply();
        if (reply == null || reply.isBlank() || reply.contains("](/movie/")) {
            return result; // nothing to do, or model already produced links
        }
        Map<String, String> links = supportAiContextService.currentMovieLinks();
        String linked = insertMovieLinks(reply, links);
        if (linked.equals(reply)) {
            return result;
        }
        return new SupportAiResult(
                linked,
                result.suggestedCategory(),
                result.flowState(),
                result.ticketAction(),
                result.choices());
    }

    /** Wrap the first mention of each known movie title with a markdown link. */
    static String insertMovieLinks(String text, Map<String, String> links) {
        if (text == null || text.isBlank() || links == null || links.isEmpty()) {
            return text;
        }
        List<String> titles = new ArrayList<>(links.keySet());
        // Longest first so "Avatar Aang: The Last Airbender" wins over "Avatar".
        titles.sort((a, b) -> Integer.compare(b.length(), a.length()));

        StringBuilder pattern = new StringBuilder();
        for (String title : titles) {
            if (title == null || title.isBlank()) {
                continue;
            }
            if (pattern.length() > 0) {
                pattern.append('|');
            }
            pattern.append(Pattern.quote(title));
        }
        if (pattern.length() == 0) {
            return text;
        }

        Matcher matcher = Pattern.compile(pattern.toString(), Pattern.CASE_INSENSITIVE).matcher(text);
        StringBuilder out = new StringBuilder();
        Set<String> alreadyLinked = new HashSet<>();
        while (matcher.find()) {
            String matched = matcher.group();
            String link = resolveLink(links, matched);
            if (link != null && alreadyLinked.add(link)) {
                matcher.appendReplacement(out, Matcher.quoteReplacement("[" + matched + "](" + link + ")"));
            } else {
                matcher.appendReplacement(out, Matcher.quoteReplacement(matched));
            }
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static String resolveLink(Map<String, String> links, String matchedTitle) {
        String link = links.get(matchedTitle);
        if (link != null) {
            return link;
        }
        for (Map.Entry<String, String> entry : links.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(matchedTitle)) {
                return entry.getValue();
            }
        }
        return null;
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
            "🎫 Bạn vui lòng nhập mã vé hoặc mã đơn hàng giúp mình nhé.",
            "🔍 Mã vé này đang gặp vấn đề gì ạ?\n• Vé bị sai / nhầm (ghế, suất, phim, rạp)\n• Chưa nhận được vé sau khi thanh toán\n• Cần đổi / hủy / hoàn vé\n• Lỗi quét mã QR\n• Khác (mô tả thêm)",
            "📝 Bạn mô tả thêm chi tiết vấn đề để admin xử lý nhanh hơn nhé."
        },
        "payment", new String[]{
            "🧾 Bạn vui lòng nhập mã đơn hàng bị lỗi thanh toán giúp mình.",
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
            "🎁 Bạn vui lòng nhập mã voucher hoặc tên chương trình khuyến mãi gặp lỗi giúp mình.",
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
                + "🎫 Vé / Suất chiếu — vấn đề về mã vé, ghế, suất chiếu, đổi/hủy/hoàn vé\n"
                + "💳 Thanh toán — lỗi giao dịch, trừ tiền, hoàn tiền\n"
                + "👤 Tài khoản — đăng nhập, OTP, mật khẩu\n"
                + "🎁 Khuyến mãi — voucher, combo, mã giảm giá\n"
                + "👑 Hội viên — điểm thưởng, hạng thành viên, quyền lợi\n\n"
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

        // Check if user is responding to a confirmation prompt. Match the ACTUAL
        // confirmation replies produced below ("…kiểm tra lại thông tin rồi chọn bên dưới nhé:"
        // and the ambiguous re-ask "Mình chưa rõ ý bạn…"), not only the old edit wording,
        // so clicking "OK — Gửi ticket" (value "ok") actually finalizes the ticket.
        String lastBotMsg = getLastBotMessage(history);
        boolean wasConfirming = lastBotMsg != null && (
            lastBotMsg.contains("kiểm tra lại thông tin")
            || lastBotMsg.contains("chọn bên dưới")
            || lastBotMsg.contains("chưa rõ ý bạn")
            || lastBotMsg.contains("OK — Gửi ticket")
            || lastBotMsg.contains("muốn chỉnh sửa"));

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
                String ticketInfo = "📋 Tóm tắt ticket:\n" + summary;
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

    /** Return quick-reply choice buttons for the field at {@code fieldIndex}. The chips are
     *  chosen by the FIELD NAME (not a hardcoded index) so the "issue type" buttons show up
     *  on the right step for every category — account & membership put issueType at index 0,
     *  payment puts paymentMethod at 1 and issueType at 2. */
    private List<ChoiceButton> getChoicesForField(String category, int fieldIndex) {
        String[] fields = CATEGORY_FLOW_FIELDS.get(category);
        if (fields == null || fieldIndex < 0 || fieldIndex >= fields.length) {
            return null;
        }
        return switch (fields[fieldIndex]) {
            case "issueType" -> issueTypeChoices(category);
            case "paymentMethod" -> paymentMethodChoices();
            default -> null;
        };
    }

    /** Issue-type quick replies per category. */
    private List<ChoiceButton> issueTypeChoices(String category) {
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

    /** Payment-method quick replies (payment flow, field "paymentMethod"). */
    private List<ChoiceButton> paymentMethodChoices() {
        return List.of(
            new ChoiceButton("🟦 ZaloPay", "ZaloPay"),
            new ChoiceButton("🟪 MoMo", "MoMo"),
            new ChoiceButton("🏦 VNPay", "VNPay"),
            new ChoiceButton("💳 Thẻ ngân hàng", "Thẻ ngân hàng"),
            new ChoiceButton("🌐 Stripe / thẻ quốc tế", "Stripe"),
            new ChoiceButton("📝 Khác", "Khác")
        );
    }

    // Opening messages that merely SELECT a topic (guided-category chip labels and the
    // generic seeds sent when a guided category is picked). They must never be counted as
    // an answer to a flow field — otherwise the bot skips every question and jumps straight
    // to the summary. Stored already-normalized (diacritics stripped, punctuation → space).
    private static final java.util.Set<String> GUIDED_OPENERS = java.util.Set.of(
        // Category chip labels
        "ve suat chieu", "thanh toan", "tai khoan", "khuyen mai", "hoi vien", "khac",
        // Guided seeds / quick-shortcut queries
        "toi khong dang nhap duoc va can ho tro tai khoan",
        "toi can ho tro ve voucher hoac khuyen mai",
        "toi can ho tro ve hoi vien va diem thuong",
        "toi can ho tro ve ve hoac suat chieu",
        "toi can ho tro ve thanh toan",
        "toi co van de khac can duoc ho tro"
    );

    /** True when a user message is a real answer to a flow question — i.e. not empty, not a
     *  pure "ok"/"sửa" button click and not a topic-selection opener (category chip / seed). */
    private boolean isFieldAnswer(String content) {
        if (content == null) return false;
        String norm = normalize(content)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (norm.length() < 2) return false;
        if (CONFIRM_YES.contains(norm) || CONFIRM_EDIT.contains(norm)) return false;
        return !GUIDED_OPENERS.contains(norm);
    }

    /** Ordered list of substantive user answers so far, used both to measure flow progress
     *  and to fill the ticket summary/description. {@code history} already contains the
     *  current message (the frontend appends it before sending); {@code message} is only
     *  added as a fallback when it isn't already the last entry. */
    private List<String> collectFieldAnswers(List<SupportAiMessage> history, String message) {
        List<String> answers = new ArrayList<>();
        if (history != null) {
            for (SupportAiMessage m : history) {
                if (m == null || !"user".equals(m.role()) || m.content() == null) continue;
                if (isFieldAnswer(m.content())) {
                    answers.add(m.content().replaceAll("\\s+", " ").trim());
                }
            }
        }
        if (message != null && isFieldAnswer(message)) {
            String cleaned = message.replaceAll("\\s+", " ").trim();
            if (answers.isEmpty() || !answers.get(answers.size() - 1).equals(cleaned)) {
                answers.add(cleaned);
            }
        }
        return answers;
    }

    /**
     * Count how many flow fields the user has actually answered so far.
     * Progress advances ONE field per substantive user turn — we intentionally do NOT use a
     * "message length" heuristic (a single long opener/seed used to satisfy every field at
     * once, making the bot jump straight to the summary without letting the user pick an
     * issue type or describe anything).
     */
    private int countCollectedFields(String normalized, String message, String category, List<SupportAiMessage> history) {
        String[] fields = CATEGORY_FLOW_FIELDS.get(category);
        if (fields == null) return 0;
        return Math.min(collectFieldAnswers(history, message).size(), fields.length);
    }

    /** Take the last {@code max} field answers (they align 1:1 with the flow fields in order). */
    private List<String> fieldValues(List<SupportAiMessage> history, String message, int max) {
        List<String> answers = collectFieldAnswers(history, message);
        if (answers.size() <= max) return answers;
        return new ArrayList<>(answers.subList(answers.size() - max, answers.size()));
    }

    /** Build a ticket summary from collected fields. */
    private String buildSummary(String category, String message, List<SupportAiMessage> history) {
        StringBuilder sb = new StringBuilder();
        String[] fields = CATEGORY_FLOW_FIELDS.get(category);
        if (fields == null) return sb.toString();

        String[] fieldLabels = getFieldLabels(category);
        if (fieldLabels == null) return sb.toString();

        // Field answers in order (openers / confirm clicks excluded, current message deduped)
        List<String> substantial = fieldValues(history, message, fields.length);

        // Category name
        String catName = switch (category) {
            case "ticket" -> "Vé / Suất chiếu";
            case "payment" -> "Thanh toán";
            case "account" -> "Tài khoản";
            case "promo" -> "Khuyến mãi";
            case "membership" -> "Hội viên";
            default -> category;
        };
        sb.append("• Danh mục: ").append(catName).append("\n");

        // Fill in each field from collected messages
        for (int i = 0; i < fields.length && i < fieldLabels.length; i++) {
            String value = i < substantial.size() ? substantial.get(i) : "(chưa cung cấp)";
            // Truncate long values
            if (value.length() > 120) value = value.substring(0, 117) + "...";
            sb.append("• ").append(fieldLabels[i]).append(": ").append(value).append("\n");
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

        // Field answers in order (openers / confirm clicks excluded, current message deduped)
        List<String> substantial = fieldValues(history, message, fieldLabels.length);

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
        // Short confirm/edit replies from the guided-flow buttons ("ok", "edit", "sửa"…)
        // are meaningful — never flag them as low-signal noise, otherwise the ticket
        // confirmation ("OK — Gửi ticket") would be rejected as "chưa hiểu rõ".
        if (CONFIRM_YES.contains(normalized) || CONFIRM_EDIT.contains(normalized)) {
            return false;
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
        return DEFAULT_PERSONA_PROMPT;
    }

    // ── AI Provider routing ──────────────────────────────────────────────

    /**
     * Presentation rules injected in code (not just the persona) so the layout of a
     * "gợi ý / liệt kê phim" answer is identical on every machine — even when that
     * machine still has an out-of-date personaPrompt saved in system_config.
     */
    private static final String ANSWER_FORMAT_RULES = """
            QUY TẮC TRÌNH BÀY (BẮT BUỘC khi gợi ý / liệt kê phim, suất chiếu, combo, voucher):
            - Mở đầu bằng 1 câu ngắn giới thiệu.
            - MỖI phim/mục nằm trên MỘT DÒNG riêng, bắt đầu bằng "• " và có XUỐNG DÒNG thật.
              KHÔNG dồn tất cả vào một đoạn văn dài.
            - Mỗi dòng phim gồm: tên phim + 1 thông tin ngắn (thể loại / giờ chiếu / giá) nếu có trong dữ liệu.
            - Ghi ĐÚNG NGUYÊN VĂN tên phim như trong DỮ LIỆU THỰC TẾ (không dịch, không rút gọn, không thêm bớt)
              để hệ thống tự gắn link cho khách bấm mở trang phim. TUYỆT ĐỐI không tự chèn URL hay mã UUID.
            - Kết thúc bằng 1 câu hỏi gợi mở (ví dụ: "Bạn muốn đặt vé phim nào ạ?").
            """;

    private List<SupportAiMessage> buildMessages(
            String message,
            List<SupportAiMessage> history,
            boolean answerMode,
            String userEmail) {
        List<SupportAiMessage> messages = new ArrayList<>();
        String persona = resolvePersonaPrompt()
                + "\n\nQUY TẮC OUTPUT BẮT BUỘC:\n"
                + "- Chỉ trả lời câu cuối cùng cho khách, tiếng Việt ngắn gọn.\n"
                + "- CẤM viết Thinking Process, các bước Analyze/Identify/Draft/Result, "
                + "và mọi thẻ <think>, </think>, <thinking>, <reasoning>.\n"
                + "- Câu hỏi ngoài phạm vi NASAFilm → KHÔNG từ chối thẳng thừng; trả lời hài hước, "
                + "duyên dáng rồi khéo léo lái chủ đề về đặt vé/xem phim/bắp nước tại NASAFilm.";
        if (answerMode) {
            persona = persona + "\n\nCHẾ ĐỘ GIẢI ĐÁP: Trả lời mọi câu hỏi liên quan NASAFilm bằng kiến thức sẵn có + DỮ LIỆU THỰC TẾ bên dưới. "
                + "Không mở luồng thu thập ticket. Nếu khách cần tạo ticket/gặp nhân viên, "
                + "hãy bảo họ chọn mục Hỗ trợ trên widget.\n\n"
                + ANSWER_FORMAT_RULES + "\n\n"
                + supportAiContextService.buildLiveContextBlock(userEmail);
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

    private boolean isAiConfigured() {
        return groqApiKey != null && !groqApiKey.isBlank();
    }

    /**
     * Strip chain-of-thought that some Groq reasoning models leak into content.
     */
    static String sanitizeVisibleReply(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = THINK_BLOCK.matcher(raw).replaceAll("");
        // Unclosed think block: keep only text after the last "Result:" if present
        var unclosed = THINK_OPEN_UNCLOSED.matcher(cleaned);
        if (unclosed.find()) {
            String lower = cleaned.toLowerCase();
            int resultIdx = lower.lastIndexOf("result:");
            if (resultIdx >= 0) {
                cleaned = cleaned.substring(resultIdx + "result:".length());
            } else {
                cleaned = unclosed.replaceAll("");
            }
        }
        cleaned = THINK_HEADING.matcher(cleaned).replaceAll("");
        cleaned = cleaned.replaceAll("(?is)</?\\s*(?:think|thinking|reasoning)\\s*>", "");
        cleaned = cleaned.replaceAll("[\\r\\n]{3,}", "\n\n").trim();
        return cleaned.isBlank() ? null : cleaned;
    }

    public boolean isConfigured() {
        return isAiConfigured();
    }

    /** Public status label — do not expose provider brand to clients. */
    public String getRuntimeMode() {
        return isConfigured() ? "AI" : "FALLBACK";
    }

    private SupportAiResult callAi(List<SupportAiMessage> messages, String detectedCategory) {
        if (!isAiConfigured()) {
            return null;
        }
        try {
            String payload = objectMapper.writeValueAsString(new ChatCompletionRequest(groqModel, messages));

            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                if (attempt > 0) Thread.sleep(300L * attempt);
                try {
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(groqApiUrl))
                            .timeout(Duration.ofSeconds(20))
                            .header("Content-Type", "application/json")
                            .header("Authorization", "Bearer " + groqApiKey)
                            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                            .build();

                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        String reply = root.path("choices").path(0).path("message").path("content").asText(null);
                        String visible = sanitizeVisibleReply(reply);
                        if (visible != null && !visible.isBlank()) {
                            log.info("Support AI responded successfully");
                            return new SupportAiResult(visible, detectedCategory);
                        }
                    }
                    if (response.statusCode() >= 500) {
                        log.warn("Support AI server error {} on attempt {}/{}", response.statusCode(), attempt + 1, MAX_RETRIES + 1);
                        continue;
                    }
                    log.warn("Support AI returned {} — no reply", response.statusCode());
                    break;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    log.warn("Support AI call failed on attempt {}/{}: {}", attempt + 1, MAX_RETRIES + 1, e.getMessage());
                    if (attempt >= MAX_RETRIES) break;
                }
            }
        } catch (Exception e) {
            log.warn("Support AI provider failed: {}", e.getMessage());
        }
        return null;
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

    private record ChatCompletionRequest(String model, List<SupportAiMessage> messages) {}
}
