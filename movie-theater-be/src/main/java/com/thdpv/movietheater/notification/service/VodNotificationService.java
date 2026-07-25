package com.thdpv.movietheater.notification.service;

import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.auth.service.EmailService;
import com.thdpv.movietheater.booking.util.VodTicketUtils;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class VodNotificationService {

    private final EmailService emailService;
    private final UserRepository userRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public VodNotificationService(EmailService emailService, UserRepository userRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    public void sendVodTicketEmail(UUID userUuid, UUID bookingUuid, String movieTitle, UUID movieUuid) {
        User user = userRepository.findById(userUuid).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        String ticketCode = VodTicketUtils.formatTicketCode(bookingUuid);
        String activationUrl = frontendUrl + "/online/activate/" + movieUuid;
        String customerName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getEmail();

        emailService.sendTemplatedEmail(
                EmailTemplateService.CODE_VOD_TICKET,
                user.getEmail(),
                Map.of(
                        "TICKET_CODE", ticketCode,
                        "MOVIE_TITLE", movieTitle != null ? movieTitle : "Phim",
                        "CUSTOMER_NAME", customerName,
                        "ACTIVATION_URL", activationUrl,
                        "BOOKING_UUID", bookingUuid.toString()));
    }
}
