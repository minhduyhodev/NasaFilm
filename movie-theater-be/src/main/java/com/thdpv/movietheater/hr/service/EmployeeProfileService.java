package com.thdpv.movietheater.hr.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.hr.dto.request.EmployeeProfileRequest;
import com.thdpv.movietheater.hr.dto.response.EmployeeProfileResponse;
import com.thdpv.movietheater.hr.entity.EmployeeProfile;
import com.thdpv.movietheater.hr.repository.EmployeeProfileRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class EmployeeProfileService {

    private static final BigDecimal DEFAULT_WEEKDAY = new BigDecimal("1.50");
    private static final BigDecimal DEFAULT_WEEKEND = new BigDecimal("2.00");
    private static final BigDecimal DEFAULT_HOLIDAY = new BigDecimal("2.00");

    private final EmployeeProfileRepository employeeProfileRepository;
    private final UserRepository userRepository;
    private final HrDirectory directory;

    public EmployeeProfileService(EmployeeProfileRepository employeeProfileRepository,
            UserRepository userRepository,
            HrDirectory directory) {
        this.employeeProfileRepository = employeeProfileRepository;
        this.userRepository = userRepository;
        this.directory = directory;
    }

    @Transactional(readOnly = true)
    public List<EmployeeProfileResponse> listStaffWithProfiles() {
        List<User> staff = userRepository
                .searchStaffUsers(null, null, PageRequest.of(0, 1000))
                .getContent();
        return staff.stream().map(user -> {
            Optional<EmployeeProfile> profile = employeeProfileRepository.findByUserUuid(user.getId());
            return toResponse(user, profile.orElse(null));
        }).toList();
    }

    @Transactional(readOnly = true)
    public EmployeeProfileResponse getByUser(UUID userId) {
        User user = directory.requireUser(userId);
        return toResponse(user, employeeProfileRepository.findByUserUuid(userId).orElse(null));
    }

    @Transactional
    public EmployeeProfileResponse upsert(UUID userId, EmployeeProfileRequest request, UUID actorId) {
        User user = directory.requireUser(userId);
        EmployeeProfile profile = employeeProfileRepository.findByUserUuid(userId)
                .orElseGet(EmployeeProfile::new);
        boolean isNew = profile.getUuid() == null;
        if (isNew) {
            profile.setUuid(UUID.randomUUID());
            profile.setUserUuid(userId);
            profile.setCreatedAt(AppTimeZones.now());
        }
        profile.setHourlyRate(request.hourlyRate() != null ? request.hourlyRate() : BigDecimal.ZERO);
        profile.setOtMultiplierWeekday(request.otMultiplierWeekday() != null ? request.otMultiplierWeekday() : DEFAULT_WEEKDAY);
        profile.setOtMultiplierWeekend(request.otMultiplierWeekend() != null ? request.otMultiplierWeekend() : DEFAULT_WEEKEND);
        profile.setOtMultiplierHoliday(request.otMultiplierHoliday() != null ? request.otMultiplierHoliday() : DEFAULT_HOLIDAY);
        profile.setEmploymentType(request.employmentType() != null ? request.employmentType() : "PART_TIME");
        profile.setActive(request.active() == null || request.active());
        profile.setNote(request.note());
        profile.setUpdatedAt(AppTimeZones.now());
        profile.setUpdatedBy(actorId);
        employeeProfileRepository.save(profile);
        return toResponse(user, profile);
    }

    /** Đơn giá dùng để tính lương; nếu chưa có hồ sơ thì trả về hồ sơ mặc định (rate = 0). */
    @Transactional(readOnly = true)
    public EmployeeProfile resolveOrDefault(UUID userId) {
        return employeeProfileRepository.findByUserUuid(userId).orElseGet(() -> {
            EmployeeProfile fallback = new EmployeeProfile();
            fallback.setUserUuid(userId);
            fallback.setHourlyRate(BigDecimal.ZERO);
            fallback.setOtMultiplierWeekday(DEFAULT_WEEKDAY);
            fallback.setOtMultiplierWeekend(DEFAULT_WEEKEND);
            fallback.setOtMultiplierHoliday(DEFAULT_HOLIDAY);
            return fallback;
        });
    }

    @Transactional(readOnly = true)
    public EmployeeProfile requireProfile(UUID userId) {
        return employeeProfileRepository.findByUserUuid(userId)
                .orElseThrow(() -> new AppException(ErrorCode.HR_PROFILE_NOT_FOUND));
    }

    private EmployeeProfileResponse toResponse(User user, EmployeeProfile profile) {
        boolean hasProfile = profile != null && profile.getUuid() != null;
        return new EmployeeProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getAvatarUrl(),
                directory.roleNames(user.getId()),
                hasProfile,
                hasProfile ? profile.getHourlyRate() : BigDecimal.ZERO,
                hasProfile ? profile.getOtMultiplierWeekday() : DEFAULT_WEEKDAY,
                hasProfile ? profile.getOtMultiplierWeekend() : DEFAULT_WEEKEND,
                hasProfile ? profile.getOtMultiplierHoliday() : DEFAULT_HOLIDAY,
                hasProfile ? profile.getEmploymentType() : "PART_TIME",
                !hasProfile || profile.isActive(),
                hasProfile ? profile.getNote() : null,
                hasProfile ? profile.getUpdatedAt() : null);
    }
}
