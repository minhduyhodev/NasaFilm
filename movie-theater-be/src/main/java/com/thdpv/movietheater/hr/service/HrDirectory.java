package com.thdpv.movietheater.hr.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.auth.repository.UserPermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.hr.dto.response.StaffDirectoryResponse;
import com.thdpv.movietheater.hr.entity.EmployeeProfile;
import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.repository.EmployeeProfileRepository;
import com.thdpv.movietheater.hr.repository.ShiftDefinitionRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.enums.PermissionName;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.repository.UserRepository;

/**
 * Tra cứu dùng chung cho phân hệ HR: người dùng, vai trò, danh mục ca và
 * xác định nhân viên đang đăng nhập.
 */
@Component
public class HrDirectory {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final ShiftDefinitionRepository shiftDefinitionRepository;

    public HrDirectory(UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            UserPermissionRepository userPermissionRepository,
            EmployeeProfileRepository employeeProfileRepository,
            ShiftDefinitionRepository shiftDefinitionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.employeeProfileRepository = employeeProfileRepository;
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

    /**
     * Danh bạ nhân viên kèm trạng thái hồ sơ lương và các quyền hiệu lực.
     * Quyền hiệu lực = ADMIN có toàn bộ quyền; nhân viên khác lấy theo user_permissions.
     * Dùng truy vấn gộp để tránh N+1.
     */
    @Transactional(readOnly = true)
    public List<StaffDirectoryResponse> staffDirectory() {
        List<User> staff = listActiveStaff();
        if (staff.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = staff.stream().map(User::getId).toList();

        Set<UUID> adminIds = new HashSet<>(userRoleRepository.findUserIdsByRole(ids, RoleName.ADMIN));

        Map<UUID, Set<String>> permsByUser = new LinkedHashMap<>();
        for (UserPermissionRepository.UserPermissionRow row : userPermissionRepository.findPermissionRowsByUserIds(ids)) {
            permsByUser.computeIfAbsent(row.getUserId(), k -> new LinkedHashSet<>()).add(row.getName());
        }

        Map<UUID, EmployeeProfile> profByUser = employeeProfileRepository.findByUserUuidIn(ids).stream()
                .collect(Collectors.toMap(EmployeeProfile::getUserUuid, p -> p, (a, b) -> a, LinkedHashMap::new));

        List<String> allPermissions = Arrays.stream(PermissionName.values()).map(Enum::name).toList();

        return staff.stream().map(u -> {
            boolean admin = adminIds.contains(u.getId());
            List<String> effective = admin
                    ? allPermissions
                    : new ArrayList<>(permsByUser.getOrDefault(u.getId(), Set.of()));
            EmployeeProfile profile = profByUser.get(u.getId());
            boolean hasSalaryProfile = profile != null && profile.isActive();
            return new StaffDirectoryResponse(
                    u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl(),
                    hasSalaryProfile, effective);
        }).toList();
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
