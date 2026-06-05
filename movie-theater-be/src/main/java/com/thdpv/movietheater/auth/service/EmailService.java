package com.thdpv.movietheater.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendOtpEmail(String toEmail, String otpCode) {
        String subject = "NASA FILM - Mã xác thực đăng ký tài khoản";
        String htmlContent = buildOtpTemplate(otpCode);
        sendHtmlEmail(toEmail, subject, htmlContent);
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

    private String buildOtpTemplate(String otpCode) {
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
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #e50914, #9f060f); padding: 30px; text-align: center;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 2px;">NASA FILM</h1>
                                            <p style="margin: 5px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Xác thực tài khoản của bạn</p>
                                        </td>
                                    </tr>
                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 40px 30px; line-height: 1.6; font-size: 15px; color: #cbd5e1;">
                                            <p style="margin-top: 0; color: #ffffff; font-size: 18px; font-weight: 600;">Chào mừng bạn đến với rạp chiếu phim NASA FILM!</p>
                                            <p>Cảm ơn bạn đã đăng ký thành viên trên hệ thống của chúng tôi. Để hoàn tất quá trình đăng ký và kích hoạt tài khoản của mình, vui lòng sử dụng mã xác thực OTP dưới đây:</p>
                                            
                                            <!-- OTP Card -->
                                            <div style="text-align: center; margin: 35px 0;">
                                                <div style="display: inline-block; background-color: #1e293b; border: 2px dashed #e50914; border-radius: 12px; padding: 15px 40px;">
                                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ff3b47;">{{OTP_CODE}}</span>
                                                </div>
                                                <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8;">(Mã xác thực có hiệu lực trong vòng 5 phút)</p>
                                            </div>
                                            
                                            <p>Nếu bạn không thực hiện yêu cầu này, xin vui lòng bỏ qua email này. Tài khoản của bạn sẽ không được tạo nếu chưa qua xác minh.</p>
                                            <p style="margin-bottom: 0;">Trân trọng,<br><strong style="color: #ffffff;">Đội ngũ NASA FILM</strong></p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #0f131f; padding: 20px 30px; text-align: center; border-top: 1px solid #1e293b;">
                                            <p style="margin: 0; color: #64748b; font-size: 12px;">&copy; 2026 NASA FILM. All rights reserved.</p>
                                            <p style="margin: 5px 0 0; color: #475569; font-size: 11px;">Đây là email tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """;
        return template.replace("{{OTP_CODE}}", otpCode);
    }
}
