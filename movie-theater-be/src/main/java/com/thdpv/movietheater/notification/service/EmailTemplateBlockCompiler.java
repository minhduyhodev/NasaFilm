package com.thdpv.movietheater.notification.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

/**
 * Compiles structured email content blocks (JSON) into NASA FILM HTML shell.
 */
final class EmailTemplateBlockCompiler {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Set<String> URL_FIELDS = Set.of("ACTIVATION_URL", "PROFILE_URL", "RESET_LINK", "BOARDING_URL", "ACTIVATION_LINK");
    private static final Map<String, String> SUBTITLE_BY_CODE = Map.of(
            EmailTemplateService.CODE_VOD_TICKET, "Vé xem phim trực tuyến",
            EmailTemplateService.CODE_THEATER_TICKET, "Vé xem phim tại rạp",
            EmailTemplateService.CODE_OTP_REGISTER, "Xác thực tài khoản",
            EmailTemplateService.CODE_PASSWORD_RESET, "Đặt lại mật khẩu",
            EmailTemplateService.CODE_ACCOUNT_ACTIVATION, "Chào mừng hội viên mới",
            EmailTemplateService.CODE_STAFF_ACTIVATION, "Tài khoản Nhân sự");

    private EmailTemplateBlockCompiler() {
    }

    static String compile(String contentBlocksJson, String templateCode) {
        if (contentBlocksJson == null || contentBlocksJson.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Nội dung mẫu email không được để trống");
        }
        try {
            JsonNode root = MAPPER.readTree(contentBlocksJson);
            JsonNode blocksNode = root.has("blocks") ? root.get("blocks") : root;
            if (!blocksNode.isArray() || blocksNode.isEmpty()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mẫu email cần ít nhất một khối nội dung");
            }
            List<Map<String, Object>> blocks = MAPPER.convertValue(blocksNode, new TypeReference<>() {
            });
            String inner = blocks.stream()
                    .map(EmailTemplateBlockCompiler::blockToHtml)
                    .filter(html -> html != null && !html.isBlank())
                    .reduce("", (a, b) -> a + b);
            String subtitle = SUBTITLE_BY_CODE.getOrDefault(
                    templateCode != null ? templateCode.toUpperCase() : "",
                    "Thông báo từ NASA FILM");
            return wrapShell(inner, subtitle);
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Nội dung mẫu email không hợp lệ");
        }
    }

  private static String blockToHtml(Map<String, Object> block) {
        String type = stringValue(block.get("type"));
        if (type == null) {
            return "";
        }
        return switch (type) {
            case "text" -> paragraphHtml(stringValue(block.get("value")));
            case "paragraph" -> paragraphPartsHtml(block.get("parts"));
            case "field" -> fieldBlockHtml(stringValue(block.get("key")));
            case "info_table" -> infoTableHtml(block.get("rows"));
            default -> "";
        };
    }

    private static String paragraphHtml(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        return "<p style=\"margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.65;\">"
                + formatInline(text).replace("\n", "<br>") + "</p>";
    }

    private static String paragraphPartsHtml(Object partsObj) {
        if (!(partsObj instanceof List<?> parts) || parts.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (Object partObj : parts) {
            if (!(partObj instanceof Map<?, ?> part)) {
                continue;
            }
            String partType = stringValue(part.get("type"));
            if ("text".equals(partType)) {
                sb.append(escapeHtml(stringValue(part.get("value"))));
            } else if ("field".equals(partType)) {
                sb.append("{{").append(stringValue(part.get("key"))).append("}}");
            }
        }
        if (sb.isEmpty()) {
            return "";
        }
        return "<p style=\"margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.65;\">"
                + formatInline(sb.toString()) + "</p>";
    }

    private static String fieldBlockHtml(String key) {
        if (key == null || key.isBlank()) {
            return "";
        }
        String token = "{{" + key + "}}";
        if ("QR_CHECKIN_SECTION".equals(key)) {
            return token;
        }
        if (URL_FIELDS.contains(key)) {
            String label = switch (key) {
                case "RESET_LINK" -> "Đặt lại mật khẩu";
                case "ACTIVATION_URL" -> "Kích hoạt xem phim";
                case "ACTIVATION_LINK" -> "Kích hoạt tài khoản";
                case "PROFILE_URL" -> "Xem vé trong tài khoản";
                case "BOARDING_URL" -> "Thẻ lên máy bay";
                default -> "Mở liên kết";
            };
            return "<div style=\"text-align:center;margin:28px 0;\"><a href=\"" + token + "\" "
                    + "style=\"display:inline-block;background:linear-gradient(135deg,#e50914,#9f060f);"
                    + "color:#fff;padding:13px 34px;text-decoration:none;border-radius:8px;font-weight:700;\">"
                    + label + "</a></div>"
                    + "<p style=\"word-break:break-all;font-size:12px;color:#ff3b47;margin:0 0 14px;\">" + token + "</p>";
        }
        if ("TEMP_PASSWORD".equals(key)) {
            return "<div style=\"text-align:center;margin:16px 0;padding:14px 20px;background:#1e293b;"
                    + "border-radius:10px;border:1px solid #334155;\">"
                    + "<span style=\"color:#94a3b8;font-size:12px;display:block;margin-bottom:6px;\">Mật khẩu tạm thời</span>"
                    + "<span style=\"font-family:'Courier New',monospace;font-size:20px;font-weight:800;"
                    + "letter-spacing:2px;color:#ff3b47;\">" + token + "</span></div>";
        }
        if ("OTP_CODE".equals(key)) {
            return "<div style=\"text-align:center;margin:24px 0;\"><div style=\"display:inline-block;"
                    + "background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 28px;\">"
                    + "<span style=\"font-family:'Courier New',monospace;font-size:36px;font-weight:800;"
                    + "letter-spacing:8px;color:#ff3b47;\">" + token + "</span></div></div>";
        }
        if ("TICKET_CODE".equals(key) || "TICKET_CODES".equals(key)) {
            return "<div style=\"text-align:center;margin:24px 0;\"><div style=\"display:inline-block;"
                    + "background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 28px;\">"
                    + "<span style=\"font-family:'Courier New',monospace;font-size:24px;font-weight:800;"
                    + "letter-spacing:2px;color:#ff3b47;\">" + token + "</span></div></div>";
        }
        return "<div style=\"text-align:center;margin:24px 0;\"><div style=\"display:inline-block;"
                + "background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 28px;\">"
                + "<span style=\"font-family:'Courier New',monospace;font-size:24px;font-weight:800;"
                + "letter-spacing:2px;color:#ff3b47;\">" + token + "</span></div></div>";
    }

    private static String infoTableHtml(Object rowsObj) {
        if (!(rowsObj instanceof List<?> rows) || rows.isEmpty()) {
            return "";
        }
        StringBuilder rowsHtml = new StringBuilder();
        for (Object rowObj : rows) {
            if (!(rowObj instanceof Map<?, ?> row)) {
                continue;
            }
            String label = stringValue(row.get("label"));
            String key = stringValue(row.get("key"));
            if (label == null || key == null) {
                continue;
            }
            rowsHtml.append("<p style=\"margin:0 0 8px;\"><strong style=\"color:#fff;\">")
                    .append(escapeHtml(label)).append(":</strong> {{").append(key).append("}}</p>");
        }
        if (rowsHtml.isEmpty()) {
            return "";
        }
        return "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" "
                + "style=\"margin:20px 0;background:#0f131f;border-radius:10px;border:1px solid #1e293b;\">"
                + "<tr><td style=\"padding:16px 18px;font-size:14px;\">" + rowsHtml + "</td></tr></table>";
    }

    private static String formatInline(String text) {
        if (text == null) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        int i = 0;
        while (i < text.length()) {
            int start = text.indexOf("{{", i);
            if (start < 0) {
                out.append(escapeHtml(text.substring(i)));
                break;
            }
            out.append(escapeHtml(text.substring(i, start)));
            int end = text.indexOf("}}", start + 2);
            if (end < 0) {
                out.append(escapeHtml(text.substring(start)));
                break;
            }
            out.append(text, start, end + 2);
            i = end + 2;
        }
        return out.toString();
    }

    private static String wrapShell(String inner, String subtitle) {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0b0e14;color:#ffffff;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:40px 0;">
                    <tr><td align="center">
                      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%%;background-color:#121824;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                        <tr><td style="background:linear-gradient(135deg,#e50914,#9f060f);padding:28px;text-align:center;">
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:2px;">NASA FILM</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;text-transform:uppercase;letter-spacing:1px;">%s</p>
                        </td></tr>
                        <tr><td style="padding:36px 30px;line-height:1.65;font-size:15px;color:#cbd5e1;">
                          %s
                        </td></tr>
                        <tr><td style="background:#0f131f;padding:18px 30px;text-align:center;border-top:1px solid #1e293b;">
                          <p style="margin:0;color:#64748b;font-size:12px;">&copy; 2026 NASA FILM. Email tự động, vui lòng không trả lời.</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(escapeHtml(subtitle), inner);
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private static String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
