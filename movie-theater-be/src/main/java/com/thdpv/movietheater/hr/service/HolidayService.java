package com.thdpv.movietheater.hr.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.hr.dto.request.HolidayRequest;
import com.thdpv.movietheater.hr.dto.response.HolidayResponse;
import com.thdpv.movietheater.hr.entity.Holiday;
import com.thdpv.movietheater.hr.repository.HolidayRepository;

@Service
public class HolidayService {

    private final HolidayRepository holidayRepository;

    public HolidayService(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> list(Integer year) {
        List<Holiday> holidays;
        if (year != null) {
            holidays = holidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(
                    LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
        } else {
            holidays = holidayRepository.findAllByOrderByHolidayDateDesc();
        }
        return holidays.stream().map(HolidayService::toResponse).toList();
    }

    @Transactional
    public HolidayResponse create(HolidayRequest request, UUID actorId) {
        if (holidayRepository.existsByHolidayDate(request.holidayDate())) {
            throw new AppException(ErrorCode.CONFLICT, "Ngày lễ này đã tồn tại");
        }
        Holiday holiday = new Holiday();
        holiday.setUuid(UUID.randomUUID());
        holiday.setHolidayDate(request.holidayDate());
        holiday.setName(request.name());
        holiday.setMultiplierOverride(request.multiplierOverride());
        holiday.setCreatedAt(AppTimeZones.now());
        holiday.setCreatedBy(actorId);
        holidayRepository.save(holiday);
        return toResponse(holiday);
    }

    @Transactional
    public void delete(UUID uuid) {
        if (!holidayRepository.existsById(uuid)) {
            throw new AppException(ErrorCode.NOT_FOUND, "Ngày lễ không tồn tại");
        }
        holidayRepository.deleteById(uuid);
    }

    @Transactional(readOnly = true)
    public Optional<Holiday> findByDate(LocalDate date) {
        return holidayRepository.findByHolidayDate(date);
    }

    private static HolidayResponse toResponse(Holiday holiday) {
        return new HolidayResponse(
                holiday.getUuid(),
                holiday.getHolidayDate(),
                holiday.getName(),
                holiday.getMultiplierOverride());
    }
}
