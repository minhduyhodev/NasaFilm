package com.thdpv.movietheater.auth.service;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.notification.service.EmailTemplateService;
import com.thdpv.movietheater.notification.dto.response.RenderedEmail;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender, EmailTemplateService emailTemplateService) {
        this.mailSender = mailSender;
        this.emailTemplateService = emailTemplateService;
    }

    @Async
    public void sendOtpEmail(String toEmail, String otpCode) {
        sendTemplatedEmail(
                EmailTemplateService.CODE_OTP_REGISTER,
                toEmail,
                Map.of("OTP_CODE", otpCode != null ? otpCode : ""));
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        sendTemplatedEmail(
                EmailTemplateService.CODE_PASSWORD_RESET,
                toEmail,
                Map.of("RESET_LINK", resetLink != null ? resetLink : ""));
    }

    @Async
    public void sendTemplatedEmail(String templateCode, String toEmail, Map<String, String> variables) {
        RenderedEmail rendered = emailTemplateService.render(templateCode, variables);
        sendHtmlEmail(toEmail, rendered.getSubject(), rendered.getHtmlBody());
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("[EmailService] Email sent successfully to: {}", to);
        } catch (Exception e) {
            logger.error("[EmailService] Failed to send email to {}: {}", to, e.getMessage());
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    @Async
    public void sendAccountActivationEmail(String toEmail, String fullName, String loginEmail,
            String temporaryPassword, String activationLink) {
        String subject = "NASA FILM - Tài khoản của bạn đã được tạo";
        String htmlContent = buildAccountActivationTemplate(fullName, loginEmail, temporaryPassword,
                activationLink);
        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private String buildAccountActivationTemplate(String fullName, String loginEmail,
            String temporaryPassword, String activationLink) {
        String template = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b0e14; color: #ffffff;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0e14; padding: 40px 0;">
                        <tr>
                            <td align="center">
                                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #121824; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #e50914, #9f060f); padding: 30px; text-align: center;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 2px;">NASA FILM</h1>
                                            <p style="margin: 5px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Kích hoạt tài khoản thành viên</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 40px 30px; line-height: 1.6; font-size: 15px; color: #cbd5e1;">
                                            <p style="margin-top: 0; color: #ffffff; font-size: 18px; font-weight: 600;">Xin chào {{FULL_NAME}}!</p>
                                            <p>Quản trị viên đã tạo tài khoản thành viên NASA FILM cho bạn. Dưới đây là thông tin đăng nhập:</p>
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
                                                <tr><td style="padding: 12px 20px; border-bottom: 1px solid #334155;"><span style="color: #94a3b8; font-size: 12px;">Email đăng nhập</span><br><strong style="color: #fff;">{{LOGIN_EMAIL}}</strong></td></tr>
                                                <tr><td style="padding: 12px 20px;"><span style="color: #94a3b8; font-size: 12px;">Mật khẩu tạm thời</span><br><strong style="color: #ff3b47; font-family: monospace; font-size: 16px;">{{TEMP_PASSWORD}}</strong></td></tr>
                                            </table>
                                            <p>Để bảo mật, vui lòng nhấn nút bên dưới để <strong style="color: #fff;">đặt mật khẩu mới</strong> và kích hoạt tài khoản:</p>
                                            <div style="text-align: center; margin: 35px 0;">
                                                <a href="{{ACTIVATION_LINK}}" style="display: inline-block; background: linear-gradient(135deg, #e50914, #9f060f); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(229,9,20,0.4);">Kích hoạt tài khoản</a>
                                                <p style="margin: 15px 0 0; font-size: 12px; color: #94a3b8;">(Liên kết có hiệu lực trong 72 giờ)</p>
                                            </div>
                                            <p style="color: #94a3b8; font-size: 13px;">Nếu nút trên không hoạt động, sao chép liên kết sau vào trình duyệt:</p>
                                            <p style="word-break: break-all; font-size: 12px; color: #ff3b47;">{{ACTIVATION_LINK}}</p>
                                            <p style="margin-bottom: 0;">Trân trọng,<br><strong style="color: #ffffff;">Đội ngũ NASA FILM</strong></p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="background-color: #0f131f; padding: 20px 30px; text-align: center; border-top: 1px solid #1e293b;">
                                            <p style="margin: 0; color: #64748b; font-size: 12px;">&copy; 2026 NASA FILM. All rights reserved.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """;
        return template
                .replace("{{FULL_NAME}}", escapeHtml(fullName))
                .replace("{{LOGIN_EMAIL}}", escapeHtml(loginEmail))
                .replace("{{TEMP_PASSWORD}}", escapeHtml(temporaryPassword))
                .replace("{{ACTIVATION_LINK}}", activationLink);
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

}
