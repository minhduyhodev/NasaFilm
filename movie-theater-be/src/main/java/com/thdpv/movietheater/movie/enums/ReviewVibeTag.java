package com.thdpv.movietheater.movie.enums;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum ReviewVibeTag {
    CAM_DONG("cam_dong", "Cảm động", "#cảm_động"),
    PLOT_TWIST("plot_twist", "Plot twist", "#plot_twist"),
    DANG_XEM_RAP("dang_xem_rap", "Đáng xem rạp", "#đáng_xem_rạp"),
    XEM_O_NHA_OK("xem_o_nha_ok", "Xem ở nhà OK", "#xem_ở_nhà_ok"),
    VISUAL_DINH("visual_dinh", "Visual đỉnh", "#visual_đỉnh"),
    HAI_LONG("hai_long", "Hài lòng", "#hài_lòng"),
    SO("so", "Sợ", "#sợ");

    private static final Map<String, ReviewVibeTag> BY_CODE = Arrays.stream(values())
            .collect(Collectors.toMap(ReviewVibeTag::getCode, Function.identity()));

    private final String code;
    private final String label;
    private final String hash;

    ReviewVibeTag(String code, String label, String hash) {
        this.code = code;
        this.label = label;
        this.hash = hash;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public String getHash() {
        return hash;
    }

    public static Optional<ReviewVibeTag> fromCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_CODE.get(code.trim().toLowerCase()));
    }
}
