package com.thdpv.movietheater.preshow.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.preshow.dto.PreShowReminderCandidate;
import com.thdpv.movietheater.preshow.entity.PreShowNotification;
import com.thdpv.movietheater.preshow.repository.PreShowNotificationRepository;
import com.thdpv.movietheater.preshow.util.PreShowReminderRules;

@Service
public class PreShowReminderService {

    public static final String TYPE_MAP_REMINDER = "MAP_REMINDER";
    public static final String TYPE_BOARDING_SOON = "BOARDING_SOON";

    private static final Logger log = LoggerFactory.getLogger(PreShowReminderService.class);
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    @Value("${app.pre-show.enabled:true}")
    private boolean preShowEnabled;

    @Value("${app.pre-show.notify-minutes-before:60}")
    private int notifyMinutesBefore;

    @Value("${app.pre-show.boarding-soon-minutes:15}")
    private int boardingSoonMinutes;

    @Value("${app.pre-show.scheduler-window-minutes:5}")
    private int schedulerWindowMinutes;

    private final BookingRepository bookingRepository;
    private final PreShowNotificationRepository preShowNotificationRepository;
    private final UserNotificationService userNotificationService;
    private final PreShowService preShowService;

    public PreShowReminderService(
            BookingRepository bookingRepository,
            PreShowNotificationRepository preShowNotificationRepository,
            UserNotificationService userNotificationService,
            PreShowService preShowService) {
        this.bookingRepository = bookingRepository;
        this.preShowNotificationRepository = preShowNotificationRepository;
        this.userNotificationService = userNotificationService;
        this.preShowService = preShowService;
    }

    @Transactional
    public int dispatchDueReminders() {
        if (!preShowEnabled) {
            return 0;
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.ofHours(7));
        int horizonMinutes = Math.max(notifyMinutesBefore, boardingSoonMinutes) + schedulerWindowMinutes + 1;
        OffsetDateTime until = now.plusMinutes(horizonMinutes);

        List<PreShowReminderCandidate> candidates =
                bookingRepository.findUpcomingTheaterReminderCandidates(now, until);
        int sentCount = 0;

        for (PreShowReminderCandidate candidate : candidates) {
            if (candidate.showtimeStart() == null) {
                continue;
            }

            OffsetDateTime startTime = candidate.showtimeStart().withOffsetSameInstant(ZoneOffset.ofHours(7));
            long minutesUntil = Duration.between(now, startTime).toMinutes();

            if (PreShowReminderRules.shouldSendReminder(minutesUntil, notifyMinutesBefore)
                    && !preShowNotificationRepository.existsByBookingUuidAndNotificationType(
                            candidate.bookingUuid(), TYPE_MAP_REMINDER)) {
                sendReminder(candidate, TYPE_MAP_REMINDER, minutesUntil, startTime);
                sentCount++;
            }

            if (PreShowReminderRules.shouldSendReminder(minutesUntil, boardingSoonMinutes)
                    && !preShowNotificationRepository.existsByBookingUuidAndNotificationType(
                            candidate.bookingUuid(), TYPE_BOARDING_SOON)) {
                sendReminder(candidate, TYPE_BOARDING_SOON, minutesUntil, startTime);
                sentCount++;
            }
        }

        if (sentCount > 0) {
            log.info("Pre-show reminders sent: {}", sentCount);
        }
        return sentCount;
    }

    private void sendReminder(
            PreShowReminderCandidate candidate,
            String type,
            long minutesUntil,
            OffsetDateTime startTime) {
        String movieTitle = candidate.movieTitle() != null ? candidate.movieTitle() : "phim của bạn";
        String cinemaName = candidate.cinemaName() != null ? candidate.cinemaName() : "rạp chiếu";
        String timeLabel = startTime.format(TIME_FORMAT);

        Cinema cinema = new Cinema();
        cinema.setName(candidate.cinemaName());
        cinema.setAddress(candidate.cinemaAddress());
        cinema.setLatitude(candidate.cinemaLatitude());
        cinema.setLongitude(candidate.cinemaLongitude());

        String mapsUrl = preShowService.buildMapsUrl(cinema);
        String boardingPath = "/pre-show/boarding/" + candidate.bookingUuid();

        String title;
        String content;
        if (TYPE_BOARDING_SOON.equals(type)) {
            title = "Lên máy bay";
            content = "Sắp vào buồng chiếu — Mở thẻ lên máy bay để xuất trình mã QR.";
        } else {
            title = "Sắp cất cánh";
            content = "Còn " + Math.max(minutesUntil, 1) + " phút đến cửa sổ cất cánh — Suất "
                    + movieTitle + " lúc " + timeLabel + " tại " + cinemaName + ".";
        }

        if (mapsUrl != null) {
            content += "\nDẫn đường: " + mapsUrl;
        }

        userNotificationService.createSystemNotification(
                candidate.userUuid(), title, content, "info", boardingPath);

        PreShowNotification record = new PreShowNotification();
        record.setUuid(UUID.randomUUID());
        record.setBookingUuid(candidate.bookingUuid());
        record.setNotificationType(type);
        record.setSentAt(OffsetDateTime.now());
        preShowNotificationRepository.save(record);
    }
}
