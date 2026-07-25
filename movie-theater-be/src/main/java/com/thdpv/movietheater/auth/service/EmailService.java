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
    public void sendAccountActivationEmail(String toEmail, String fullName, String loginEmail,
            String temporaryPassword, String activationLink) {
        sendTemplatedEmail(
                EmailTemplateService.CODE_ACCOUNT_ACTIVATION,
                toEmail,
                Map.of(
                        "FULL_NAME", fullName != null ? fullName : "",
                        "LOGIN_EMAIL", loginEmail != null ? loginEmail : "",
                        "TEMP_PASSWORD", temporaryPassword != null ? temporaryPassword : "",
                        "ACTIVATION_LINK", activationLink != null ? activationLink : ""));
    }

    @Async
    public void sendStaffActivationEmail(String toEmail, String fullName, String loginEmail,
            String temporaryPassword, String activationLink) {
        sendTemplatedEmail(
                EmailTemplateService.CODE_STAFF_ACTIVATION,
                toEmail,
                Map.of(
                        "FULL_NAME", fullName != null ? fullName : "",
                        "LOGIN_EMAIL", loginEmail != null ? loginEmail : "",
                        "TEMP_PASSWORD", temporaryPassword != null ? temporaryPassword : "",
                        "ACTIVATION_LINK", activationLink != null ? activationLink : ""));
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
}
