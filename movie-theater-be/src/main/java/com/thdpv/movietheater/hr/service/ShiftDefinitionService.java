package com.thdpv.movietheater.hr.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.hr.entity.ShiftDefinition;
import com.thdpv.movietheater.hr.dto.response.ShiftDefinitionResponse;
import com.thdpv.movietheater.hr.repository.ShiftDefinitionRepository;

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

    public static ShiftDefinitionResponse toResponse(ShiftDefinition shift) {
        return new ShiftDefinitionResponse(
                shift.getUuid(),
                shift.getCode(),
                shift.getName(),
                shift.getStartTime(),
                shift.getEndTime(),
                shift.getStandardHours(),
                shift.isActive(),
                shift.getSortOrder());
    }
}
