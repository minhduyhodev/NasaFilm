package com.thdpv.movietheater.notification.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.notification.dto.request.EmailTemplateRequest;
import com.thdpv.movietheater.notification.dto.response.EmailTemplateResponse;
import com.thdpv.movietheater.notification.dto.response.RenderedEmail;
import com.thdpv.movietheater.notification.entity.EmailTemplate;
import com.thdpv.movietheater.notification.repository.EmailTemplateRepository;

@Service
public class EmailTemplateService {

    public static final String CODE_VOD_TICKET = "VOD_TICKET";
    public static final String CODE_THEATER_TICKET = "THEATER_TICKET";
    public static final String CODE_OTP_REGISTER = "OTP_REGISTER";
    public static final String CODE_PASSWORD_RESET = "PASSWORD_RESET";

    private final EmailTemplateRepository emailTemplateRepository;

    public EmailTemplateService(EmailTemplateRepository emailTemplateRepository) {
        this.emailTemplateRepository = emailTemplateRepository;
    }

    @Transactional(readOnly = true)
    public List<EmailTemplateResponse> getAll() {
        return emailTemplateRepository.findAllByOrderByCodeAsc().stream()
                .map(EmailTemplateResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmailTemplateResponse getById(UUID id) {
        EmailTemplate template = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy mẫu email"));
        return EmailTemplateResponse.from(template);
    }

    @Transactional
    public EmailTemplateResponse create(EmailTemplateRequest request) {
        String code = normalizeCode(request.getCode());
        if (emailTemplateRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã mẫu email đã tồn tại");
        }
        EmailTemplate template = new EmailTemplate();
        applyRequest(template, request, code);
        return EmailTemplateResponse.from(emailTemplateRepository.save(template));
    }

    @Transactional
    public EmailTemplateResponse update(UUID id, EmailTemplateRequest request) {
        EmailTemplate template = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy mẫu email"));
        String code = normalizeCode(request.getCode());
        emailTemplateRepository.findByCodeIgnoreCase(code).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã mẫu email đã tồn tại");
            }
        });
        applyRequest(template, request, code);
        return EmailTemplateResponse.from(emailTemplateRepository.save(template));
    }

    @Transactional
    public void delete(UUID id) {
        if (!emailTemplateRepository.existsById(id)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy mẫu email");
        }
        emailTemplateRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public RenderedEmail render(String templateCode, Map<String, String> variables) {
        String code = normalizeCode(templateCode);
        EmailTemplate template = emailTemplateRepository.findFirstByCodeIgnoreCaseAndActiveTrue(code).orElse(null);
        if (template == null) {
            return renderDefault(code, variables);
        }
        return new RenderedEmail(
                applyVariables(template.getSubject(), variables),
                applyVariables(template.getHtmlBody(), variables));
    }

    @Transactional
    public void ensureDefaultTemplates() {
        seedIfMissing(CODE_VOD_TICKET, "Vé xem phim online (VOD)",
                "Gửi mã vé kích hoạt xem phim trực tuyến sau khi mua vé online",
                "NASA FILM - Mã vé xem phim online {{MOVIE_TITLE}}",
                EmailTemplateBlockPresets.vodTicketBlocks());
        seedIfMissing(CODE_THEATER_TICKET, "Vé xem phim tại rạp",
                "Gửi mã vé và thông tin suất chiếu sau khi đặt vé rạp thành công",
                "NASA FILM - Vé rạp {{MOVIE_TITLE}} - {{SHOWTIME}}",
                EmailTemplateBlockPresets.theaterTicketBlocks());
        seedIfMissing(CODE_OTP_REGISTER, "OTP đăng ký tài khoản",
                "Gửi mã OTP khi người dùng đăng ký tài khoản mới",
                "NASA FILM - Mã xác thực đăng ký tài khoản",
                EmailTemplateBlockPresets.otpRegisterBlocks());
        seedIfMissing(CODE_PASSWORD_RESET, "Đặt lại mật khẩu",
                "Gửi liên kết đặt lại mật khẩu khi người dùng quên mật khẩu",
                "NASA FILM - Yêu cầu đặt lại mật khẩu",
                EmailTemplateBlockPresets.passwordResetBlocks());
        backfillContentBlocksIfMissing();
    }

    private void backfillContentBlocksIfMissing() {
        emailTemplateRepository.findAllByOrderByCodeAsc().forEach(template -> {
            if (template.getContentBlocks() != null && !template.getContentBlocks().isBlank()) {
                return;
            }
            String preset = presetBlocksForCode(template.getCode());
            if (preset == null) {
                return;
            }
            template.setContentBlocks(preset);
            template.setHtmlBody(EmailTemplateBlockCompiler.compile(preset, template.getCode()));
            emailTemplateRepository.save(template);
        });
    }

    private String presetBlocksForCode(String code) {
        if (code == null) {
            return null;
        }
        return switch (code.toUpperCase()) {
            case CODE_VOD_TICKET -> EmailTemplateBlockPresets.vodTicketBlocks();
            case CODE_THEATER_TICKET -> EmailTemplateBlockPresets.theaterTicketBlocks();
            case CODE_OTP_REGISTER -> EmailTemplateBlockPresets.otpRegisterBlocks();
            case CODE_PASSWORD_RESET -> EmailTemplateBlockPresets.passwordResetBlocks();
            default -> null;
        };
    }

    private void seedIfMissing(String code, String name, String purpose, String subject, String contentBlocks) {
        if (emailTemplateRepository.findByCodeIgnoreCase(code).isPresent()) {
            return;
        }
        EmailTemplate template = new EmailTemplate();
        template.setCode(code);
        template.setName(name);
        template.setPurpose(purpose);
        template.setSubject(subject);
        template.setContentBlocks(contentBlocks);
        template.setHtmlBody(EmailTemplateBlockCompiler.compile(contentBlocks, code));
        template.setActive(true);
        emailTemplateRepository.save(template);
    }

    private void applyRequest(EmailTemplate template, EmailTemplateRequest request, String code) {
        template.setCode(code);
        template.setName(request.getName().trim());
        template.setPurpose(request.getPurpose() != null ? request.getPurpose().trim() : null);
        template.setSubject(request.getSubject().trim());
        template.setActive(request.isActive());

        String contentBlocks = request.getContentBlocks();
        if (contentBlocks != null && !contentBlocks.isBlank()) {
            template.setContentBlocks(contentBlocks);
            template.setHtmlBody(EmailTemplateBlockCompiler.compile(contentBlocks, code));
            return;
        }

        if (request.getHtmlBody() == null || request.getHtmlBody().isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Vui lòng cung cấp nội dung mẫu email");
        }
        template.setHtmlBody(request.getHtmlBody());
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã mẫu email không được để trống");
        }
        return code.trim().toUpperCase();
    }

    private RenderedEmail renderDefault(String code, Map<String, String> variables) {
        Map<String, String> safeVars = variables != null ? variables : Map.of();
        return switch (code) {
            case CODE_VOD_TICKET -> new RenderedEmail(
                    applyVariables("NASA FILM - Mã vé xem phim online {{MOVIE_TITLE}}", safeVars),
                    applyVariables(EmailTemplateDefaults.vodTicketHtml(), safeVars));
            case CODE_THEATER_TICKET -> new RenderedEmail(
                    applyVariables("NASA FILM - Vé rạp {{MOVIE_TITLE}} - {{SHOWTIME}}", safeVars),
                    applyVariables(EmailTemplateDefaults.theaterTicketHtml(), safeVars));
            case CODE_OTP_REGISTER -> new RenderedEmail(
                    applyVariables("NASA FILM - Mã xác thực đăng ký tài khoản", safeVars),
                    applyVariables(EmailTemplateDefaults.otpRegisterHtml(), safeVars));
            case CODE_PASSWORD_RESET -> new RenderedEmail(
                    applyVariables("NASA FILM - Yêu cầu đặt lại mật khẩu", safeVars),
                    applyVariables(EmailTemplateDefaults.passwordResetHtml(), safeVars));
            default -> throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy mẫu email: " + code);
        };
    }

    private String applyVariables(String template, Map<String, String> variables) {
        if (template == null) {
            return "";
        }
        String rendered = template;
        Map<String, String> merged = new LinkedHashMap<>();
        if (variables != null) {
            merged.putAll(variables);
        }
        for (Map.Entry<String, String> entry : merged.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue() != null ? entry.getValue() : "";
            rendered = rendered.replace("{{" + key + "}}", value);
        }
        return rendered;
    }
}
