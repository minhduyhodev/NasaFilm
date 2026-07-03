package com.thdpv.movietheater.mission.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.enums.MissionConditionType;
import com.thdpv.movietheater.mission.enums.MissionRecurrence;
import com.thdpv.movietheater.mission.repository.MissionTemplateRepository;

@Component
@Order(50)
public class MissionTemplateSeeder implements ApplicationRunner {

    private final MissionTemplateRepository missionTemplateRepository;

    public MissionTemplateSeeder(MissionTemplateRepository missionTemplateRepository) {
        this.missionTemplateRepository = missionTemplateRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedIfAbsent(
                "EXPLORER",
                "Khám phá phim",
                "Xem phim thuộc 3 thể loại khác nhau trong 30 ngày gần nhất.",
                MissionConditionType.GENRE_WINDOW,
                "{\"windowDays\":30}",
                200,
                "EXPLORER",
                "Khám phá phim",
                null,
                3,
                1,
                MissionRecurrence.MONTHLY);
        seedIfAbsent(
                "PREMIERE",
                "Suất chiếu đầu",
                "Đặt vé rạp trong 3 ngày đầu phim mới ra mắt.",
                MissionConditionType.PREMIERE_BOOKING,
                "{\"windowDays\":3}",
                150,
                null,
                null,
                null,
                1,
                2,
                MissionRecurrence.ONCE);
        seedIfAbsent(
                "HYBRID_PILOT",
                "Xem rạp + online",
                "Xem cùng một bộ phim ở rạp và mua bản xem online.",
                MissionConditionType.HYBRID_THEATER_VOD,
                "{}",
                100,
                null,
                null,
                null,
                1,
                3,
                MissionRecurrence.ONCE);
        seedIfAbsent(
                "SOCIAL_ORBIT",
                "Đặt vé nhóm",
                "Tham gia phòng Orbit để đặt vé cùng bạn bè.",
                MissionConditionType.ORBIT_ROOM_JOIN,
                "{}",
                100,
                null,
                null,
                "ORBIT_SEAT",
                1,
                4,
                MissionRecurrence.ONCE);
        seedIfAbsent(
                "REVIEWER",
                "Nhà phê bình",
                "Viết 5 đánh giá có gắn vibe tag trên trang phim.",
                MissionConditionType.REVIEW_WITH_VIBE_TAG,
                "{}",
                0,
                "NASA_AUDIENCE",
                "Khán giả NASA",
                null,
                5,
                5,
                MissionRecurrence.ONCE);

        alignLocalizedCopy();
    }

    private void alignLocalizedCopy() {
        updateIfMatches("EXPLORER", "Explorer", "Khám phá phim",
                "Xem phim thuộc 3 thể loại khác nhau trong 30 ngày gần nhất.");
        updateIfMatches("PREMIERE", "Premiere", "Suất chiếu đầu",
                "Đặt vé rạp trong 3 ngày đầu phim mới ra mắt.");
        updateIfMatches("HYBRID_PILOT", "Hybrid Pilot", "Xem rạp + online",
                "Xem cùng một bộ phim ở rạp và mua bản xem online.");
        updateIfMatches("SOCIAL_ORBIT", "Social Orbit", "Đặt vé nhóm",
                "Tham gia phòng Orbit để đặt vé cùng bạn bè.");
        updateIfMatches("REVIEWER", "Reviewer", "Nhà phê bình",
                "Viết 5 đánh giá có gắn vibe tag trên trang phim.");
    }

    private void updateIfMatches(String code, String oldTitle, String newTitle, String newDescription) {
        missionTemplateRepository.findByCodeIgnoreCase(code).ifPresent(template -> {
            if (!oldTitle.equalsIgnoreCase(template.getTitle())) {
                return;
            }
            template.setTitle(newTitle);
            template.setDescription(newDescription);
            if ("EXPLORER".equals(code) && template.getRewardBadgeTitle() != null
                    && "Explorer".equalsIgnoreCase(template.getRewardBadgeTitle())) {
                template.setRewardBadgeTitle("Khám phá phim");
            }
            missionTemplateRepository.save(template);
        });
    }

    private void seedIfAbsent(
            String code,
            String title,
            String description,
            MissionConditionType conditionType,
            String conditionJson,
            int rewardPoints,
            String badgeCode,
            String badgeTitle,
            String requiresFeature,
            int targetValue,
            int sortOrder,
            MissionRecurrence recurrence) {
        if (missionTemplateRepository.findByCodeIgnoreCase(code).isPresent()) {
            return;
        }

        MissionTemplate template = new MissionTemplate();
        template.setCode(code);
        template.setVersion(1);
        template.setTitle(title);
        template.setDescription(description);
        template.setConditionType(conditionType);
        template.setConditionJson(conditionJson);
        template.setRewardPoints(rewardPoints);
        template.setRewardBadgeCode(badgeCode);
        template.setRewardBadgeTitle(badgeTitle);
        template.setRequiresFeature(requiresFeature);
        template.setRecurrence(recurrence != null ? recurrence : MissionRecurrence.ONCE);
        template.setTargetValue(targetValue);
        template.setActive(true);
        template.setSortOrder(sortOrder);
        missionTemplateRepository.save(template);
    }
}
