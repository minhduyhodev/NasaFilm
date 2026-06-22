package com.thdpv.movietheater.notification.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.auth.service.EmailService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class TheaterNotificationService {

    private final EmailService emailService;
    private final UserRepository userRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public TheaterNotificationService(EmailService emailService, UserRepository userRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    public void sendTheaterTicketEmail(
            UUID userUuid,
            UUID bookingUuid,
            String movieTitle,
            String cinemaName,
            String showtime,
            String seats,
            String combos,
            String totalPrice,
            String ticketCodes) {
        User user = userRepository.findById(userUuid).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        String customerName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getEmail();
        String primaryTicketCode = ticketCodes != null && ticketCodes.contains(",")
                ? ticketCodes.substring(0, ticketCodes.indexOf(',')).trim()
                : (ticketCodes != null ? ticketCodes.trim() : "");

        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("TICKET_CODE", primaryTicketCode);
        variables.put("TICKET_CODES", ticketCodes != null ? ticketCodes : "");
        variables.put("MOVIE_TITLE", movieTitle != null ? movieTitle : "Phim");
        variables.put("CUSTOMER_NAME", customerName);
        variables.put("CINEMA_NAME", cinemaName != null ? cinemaName : "");
        variables.put("SHOWTIME", showtime != null ? showtime : "");
        variables.put("SEATS", seats != null ? seats : "");
        variables.put("COMBOS", combos != null ? combos : "Không kèm bắp nước");
        variables.put("TOTAL_PRICE", totalPrice != null ? totalPrice : "");
        variables.put("BOOKING_UUID", bookingUuid.toString());
        variables.put("PROFILE_URL", frontendUrl + "/profile");

        emailService.sendTemplatedEmail(
                EmailTemplateService.CODE_THEATER_TICKET,
                user.getEmail(),
                variables);
    }
}
