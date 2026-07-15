package com.thdpv.movietheater.hr.service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.repository.ShiftDefinitionRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

/**
 * Tra cứu dùng chung cho phân hệ HR: người dùng, vai trò, danh mục ca và
 * xác định nhân viên đang đăng nhập.
 */
@Component
public class HrDirectory {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final ShiftDefinitionRepository shiftDefinitionRepository;

    public HrDirectory(UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            ShiftDefinitionRepository shiftDefinitionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.shiftDefinitionRepository = shiftDefinitionRepository;
    }

    @Transactional(readOnly = true)
    public UUID requireUserIdByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(email.trim())
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    public Map<UUID, User> usersByIds(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, User> map = new LinkedHashMap<>();
        for (User user : userRepository.findAllById(ids)) {
            map.put(user.getId(), user);
        }
        return map;
    }

    @Transactional(readOnly = true)
    public List<User> listActiveStaff() {
        return userRepository.searchStaffUsers(null, null, PageRequest.of(0, 1000)).getContent();
    }

    public List<String> roleNames(UUID userId) {
        return userRoleRepository.findByUserId(userId).stream()
                .map(ur -> ur.getRole().getName().name())
                .collect(Collectors.toList());
    }

    public Map<UUID, ShiftDefinition> shiftMap() {
        return shiftDefinitionRepository.findAll().stream()
                .collect(Collectors.toMap(ShiftDefinition::getUuid, s -> s, (a, b) -> a, LinkedHashMap::new));
    }

    public ShiftDefinition requireShift(UUID shiftDefinitionUuid) {
        return shiftDefinitionRepository.findById(shiftDefinitionUuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_SHIFT_NOT_FOUND));
    }
}
