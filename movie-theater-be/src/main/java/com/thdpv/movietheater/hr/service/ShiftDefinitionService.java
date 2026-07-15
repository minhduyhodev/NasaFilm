package com.thdpv.movietheater.hr.service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.hr.dto.response.ShiftDefinitionResponse;
import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.repository.ShiftDefinitionRepository;
import com.thdpv.movietheater.user.enums.PermissionName;

@Service
public class ShiftDefinitionService {

    private final ShiftDefinitionRepository shiftDefinitionRepository;

    public ShiftDefinitionService(ShiftDefinitionRepository shiftDefinitionRepository) {
        this.shiftDefinitionRepository = shiftDefinitionRepository;
    }

    @Transactional(readOnly = true)
    public List<ShiftDefinitionResponse> listActive() {
        return shiftDefinitionRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(ShiftDefinitionService::toResponse)
                .toList();
    }

    /** Cập nhật bộ quyền vận hành yêu cầu cho một ca. Danh sách rỗng/null = trả về dùng bộ mặc định. */
    @Transactional
    public ShiftDefinitionResponse updateRequiredPermissions(UUID uuid, List<String> permissions) {
        ShiftDefinition shift = shiftDefinitionRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.HR_SHIFT_NOT_FOUND));
        if (permissions == null || permissions.isEmpty()) {
            shift.setRequiredPermissions(null);
        } else {
            Set<String> valid = new LinkedHashSet<>();
            for (String raw : permissions) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                try {
                    valid.add(PermissionName.valueOf(raw.trim().toUpperCase()).name());
                } catch (IllegalArgumentException ex) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED, "Quyền không hợp lệ: " + raw);
                }
            }
            shift.setRequiredPermissions(valid.isEmpty() ? null : String.join(",", valid));
        }
        shift.setUpdatedAt(AppTimeZones.now());
        shiftDefinitionRepository.save(shift);
        return toResponse(shift);
    }

    private static List<String> defaultRequired() {
        return PermissionName.shiftOperationalRequired().stream().map(Enum::name).toList();
    }

    private static List<String> parseConfigured(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public static ShiftDefinitionResponse toResponse(ShiftDefinition shift) {
        List<String> configured = parseConfigured(shift.getRequiredPermissions());
        boolean usingDefault = configured.isEmpty();
        List<String> effective = usingDefault ? defaultRequired() : configured;
        return new ShiftDefinitionResponse(
                shift.getUuid(),
                shift.getCode(),
                shift.getName(),
                shift.getStartTime(),
                shift.getEndTime(),
                shift.getStandardHours(),
                shift.isActive(),
                shift.getSortOrder(),
                effective,
                usingDefault);
    }
}
