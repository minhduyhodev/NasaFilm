package com.thdpv.movietheater.mission.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.enums.MissionConditionType;
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
                "Explorer",
                "Xem phim thuộc 3 thể loại khác nhau trong 30 ngày gần nhất.",
                MissionConditionType.GENRE_WINDOW,
                "{\"windowDays\":30}",
                200,
                "EXPLORER",
                "Explorer",
                null,
                3,
                1);
        seedIfAbsent(
                "PREMIERE",
                "Premiere",
                "Đặt vé rạp trong 3 ngày đầu phim mới ra mắt.",
                MissionConditionType.PREMIERE_BOOKING,
                "{\"windowDays\":3}",
                150,
                null,
                null,
                null,
                1,
                2);
        seedIfAbsent(
                "HYBRID_PILOT",
                "Hybrid Pilot",
                "Xem cùng một bộ phim ở rạp và mua VOD online.",
                MissionConditionType.HYBRID_THEATER_VOD,
                "{}",
                100,
                null,
                null,
                null,
                1,
                3);
        seedIfAbsent(
                "SOCIAL_ORBIT",
                "Social Orbit",
                "Tham gia một phòng Orbit Seat để đặt vé nhóm.",
                MissionConditionType.ORBIT_ROOM_JOIN,
                "{}",
                100,
                null,
                null,
                "ORBIT_SEAT",
                1,
                4);
        seedIfAbsent(
                "REVIEWER",
                "Reviewer",
                "Viết 5 đánh giá có gắn vibe tag.",
                MissionConditionType.REVIEW_WITH_VIBE_TAG,
                "{}",
                0,
                "NASA_AUDIENCE",
                "Khán giả NASA",
                null,
                5,
                5);
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
            int sortOrder) {
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
        template.setTargetValue(targetValue);
        template.setActive(true);
        template.setSortOrder(sortOrder);
        missionTemplateRepository.save(template);
    }
}
