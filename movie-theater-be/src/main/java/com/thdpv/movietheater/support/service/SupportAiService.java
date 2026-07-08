package com.thdpv.movietheater.support.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.config.service.SystemConfigService;

@Service
public class SupportAiService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();
    private final ObjectMapper objectMapper;
    private final SystemConfigService systemConfigService;

    @Value("${app.openai.api-key:}")
    private String apiKey;

    @Value("${app.openai.model:gpt-4o-mini}")
    private String model;

    public SupportAiService(ObjectMapper objectMapper, SystemConfigService systemConfigService) {
        this.objectMapper = objectMapper;
        this.systemConfigService = systemConfigService;
    }

    public SupportAiResult chat(String message, List<SupportAiMessage> history) {
        String detectedCategory = detectCategory(message);
        if (apiKey == null || apiKey.isBlank()) {
            return fallback(message, detectedCategory);
        }

        try {
            List<SupportAiMessage> messages = new ArrayList<>();
            messages.add(new SupportAiMessage("system", resolvePersonaPrompt()));
            if (history != null) {
                messages.addAll(history.stream()
                        .filter(item -> item != null && item.role() != null && item.content() != null)
                        .toList());
            }
            messages.add(new SupportAiMessage("user", message));

            String payload = objectMapper.writeValueAsString(new OpenAiChatRequest(model, messages));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return fallback(message, detectedCategory);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String reply = root.path("choices").path(0).path("message").path("content").asText(null);
            if (reply == null || reply.isBlank()) {
                return fallback(message, detectedCategory);
            }
            return new SupportAiResult(reply.trim(), detectedCategory);
        } catch (Exception error) {
            return fallback(message, detectedCategory);
        }
    }

    private SupportAiResult fallback(String message, String category) {
        String reply = switch (category) {
            case "payment" -> "Mình ghi nhận vấn đề thanh toán. Nếu bạn muốn, mình sẽ tạo ticket ngay để admin kiểm tra giao dịch.";
            case "account" -> "Mình thấy đây là vấn đề tài khoản. Bạn có thể gửi thêm mô tả, mình sẽ tạo ticket để admin hỗ trợ.";
            case "promo" -> "Mình ghi nhận vấn đề khuyến mãi/voucher. Nếu cần, mình sẽ tạo ticket cho admin xem ngay.";
            case "membership" -> "Mình đã hiểu vấn đề hội viên. Mình có thể tạo ticket để admin kiểm tra quyền lợi và điểm thưởng.";
            default -> "Mình đã hiểu vấn đề. Mình có thể tạo ticket để admin xử lý nhanh hơn.";
        };
        return new SupportAiResult(reply, category);
    }

    private String detectCategory(String text) {
        String value = normalize(text);
        if (value.contains("thanh toan") || value.contains("payment") || value.contains("giao dich") || value.contains("refund")) {
            return "payment";
        }
        if (value.contains("tai khoan") || value.contains("login") || value.contains("dang nhap") || value.contains("otp")) {
            return "account";
        }
        if (value.contains("voucher") || value.contains("khuyen mai") || value.contains("promo")) {
            return "promo";
        }
        if (value.contains("hoi vien") || value.contains("membership") || value.contains("vip")) {
            return "membership";
        }
        if (value.contains("ve") || value.contains("ticket") || value.contains("suat chieu") || value.contains("ghe")) {
            return "ticket";
        }
        return "other";
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
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
        return "Bạn là NASA AI Assistant cho hệ thống rạp phim. Trả lời ngắn gọn, thân thiện, giống chat hỗ trợ khách hàng. Nếu cần ticket thì hỏi từng bước, ưu tiên rõ ràng, không hỏi email/SĐT vì hệ thống đã tự gắn tài khoản.";
    }

    public record SupportAiMessage(String role, String content) {}
    public record SupportAiResult(String reply, String suggestedCategory) {}

    private record OpenAiChatRequest(String model, List<SupportAiMessage> messages) {}
}
