package com.thdpv.movietheater.booking.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.thdpv.movietheater.booking.dto.request.ComboRequest;
import com.thdpv.movietheater.booking.dto.response.ComboResponse;
import com.thdpv.movietheater.booking.entity.Combo;
import com.thdpv.movietheater.booking.repository.ComboRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ComboService {

    private final ComboRepository comboRepository;
    private final Cloudinary cloudinary;

    @Transactional(readOnly = true)
    public List<Combo> getAllCombos() {
        return comboRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<ComboResponse> getActiveComboResponses() {
        return comboRepository.findByStatusIgnoreCaseOrderByNameAsc("ACTIVE").stream()
                .map(this::toComboResponse)
                .toList();
    }

    private ComboResponse toComboResponse(Combo combo) {
        return new ComboResponse(
                combo.getUuid(),
                combo.getName(),
                combo.getDescription(),
                combo.getPrice(),
                combo.getImageUrl(),
                combo.getStatus());
    }

    @Transactional
    public Combo createCombo(ComboRequest request) {
        Combo combo = new Combo();
        combo.setUuid(UUID.randomUUID());
        combo.setName(request.getName());
        combo.setDescription(request.getDescription());
        combo.setPrice(request.getPrice());
        combo.setImageUrl(request.getImageUrl());
        combo.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        return comboRepository.save(combo);
    }

    @Transactional
    public Combo updateCombo(UUID uuid, ComboRequest request) {
        Combo combo = comboRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Combo không tồn tại"));

        combo.setName(request.getName());
        combo.setDescription(request.getDescription());
        combo.setPrice(request.getPrice());
        if (request.getImageUrl() != null) {
            combo.setImageUrl(request.getImageUrl());
        }
        if (request.getIsActive() != null) {
            combo.setIsActive(request.getIsActive());
        }

        return comboRepository.save(combo);
    }

    @Transactional
    public void deleteCombo(UUID uuid) {
        Combo combo = comboRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Combo không tồn tại"));
        comboRepository.delete(combo);
    }

    public String uploadImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File ảnh rỗng");
        }
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "combos"));
            return (String) uploadResult.get("secure_url");
        } catch (Exception e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Tải hình ảnh lên Cloudinary thất bại: " + e.getMessage());
        }
    }
}
