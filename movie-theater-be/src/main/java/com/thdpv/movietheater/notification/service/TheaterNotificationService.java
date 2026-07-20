package com.thdpv.movietheater.notification.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.auth.service.EmailService;
import com.thdpv.movietheater.notification.dto.TheaterTicketQrItem;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class TheaterNotificationService {

    private final EmailService emailService;
    private final UserRepository userRepository;
    private final QrCodeImageService qrCodeImageService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public TheaterNotificationService(
            EmailService emailService,
            UserRepository userRepository,
            QrCodeImageService qrCodeImageService) {
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.qrCodeImageService = qrCodeImageService;
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
            List<TheaterTicketQrItem> tickets) {
        User user = userRepository.findById(userUuid).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        List<TheaterTicketQrItem> safeTickets = tickets != null ? tickets : List.of();
        String ticketCodes = safeTickets.stream()
                .map(TheaterTicketQrItem::ticketCode)
                .filter(code -> code != null && !code.isBlank())
                .collect(Collectors.joining(", "));
        String primaryTicketCode = safeTickets.stream()
                .map(TheaterTicketQrItem::ticketCode)
                .filter(code -> code != null && !code.isBlank())
                .findFirst()
                .orElse("");

        String customerName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getEmail();

        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("TICKET_CODE", primaryTicketCode);
        variables.put("TICKET_CODES", ticketCodes);
        variables.put("MOVIE_TITLE", movieTitle != null ? movieTitle : "Phim");
        variables.put("CUSTOMER_NAME", customerName);
        variables.put("CINEMA_NAME", cinemaName != null ? cinemaName : "");
        variables.put("SHOWTIME", showtime != null ? showtime : "");
        variables.put("SEATS", seats != null ? seats : "");
        variables.put("COMBOS", combos != null ? combos : "Không kèm bắp nước");
        variables.put("TOTAL_PRICE", totalPrice != null ? totalPrice : "");
        variables.put("BOOKING_UUID", bookingUuid.toString());
        variables.put("PROFILE_URL", frontendUrl + "/profile");
        variables.put("BOARDING_URL", frontendUrl + "/pre-show/boarding/" + bookingUuid);
        variables.put("QR_CHECKIN_SECTION", buildQrCheckInSection(safeTickets));

        emailService.sendTemplatedEmail(
                EmailTemplateService.CODE_THEATER_TICKET,
                user.getEmail(),
                variables);
    }

    private String buildQrCheckInSection(List<TheaterTicketQrItem> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return "";
        }

        StringBuilder cards = new StringBuilder();
        for (TheaterTicketQrItem ticket : tickets) {
            if (ticket.ticketCode() == null || ticket.ticketCode().isBlank()) {
                continue;
            }
            
            // Use a public QR code API instead of Base64 to ensure display in email clients
            String imageUrl = "https://quickchart.io/qr?size=150&text=" + 
                    java.net.URLEncoder.encode(ticket.ticketCode(), java.nio.charset.StandardCharsets.UTF_8);

            String seatLabel = ticket.seatLabel() != null && !ticket.seatLabel().isBlank()
                    ? ticket.seatLabel()
                    : "Vé";
            cards.append("""
                    <div style="display:inline-block;vertical-align:top;margin:10px;padding:14px;background:#ffffff;border-radius:12px;text-align:center;min-width:150px;">
                      <img src="%s" alt="QR %s" width="150" height="150" style="display:block;margin:0 auto;" />
                      <p style="margin:10px 0 4px;color:#111827;font-size:13px;font-weight:700;">Ghế %s</p>
                      <p style="margin:0;color:#64748b;font-size:11px;font-family:monospace;word-break:break-all;">%s</p>
                    </div>
                    """.formatted(imageUrl, escapeHtml(seatLabel), escapeHtml(seatLabel), escapeHtml(ticket.ticketCode())));
        }

        if (cards.isEmpty()) {
            return "";
        }

        return """
                <div style="margin:28px 0;padding:20px;background:#0f131f;border:1px solid #1e293b;border-radius:12px;text-align:center;">
                  <p style="margin:0 0 6px;color:#ffffff;font-size:16px;font-weight:700;">Mã QR check-in</p>
                  <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;">Xuất trình tại cửa soát vé — mỗi ghế một mã riêng</p>
                  %s
                </div>
                """.formatted(cards);
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
