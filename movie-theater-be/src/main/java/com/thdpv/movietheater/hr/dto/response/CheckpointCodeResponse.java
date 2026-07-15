package com.thdpv.movietheater.hr.dto.response;

/**
 * Mã điểm danh xoay theo thời gian, hiển thị dưới dạng QR tại quầy.
 *
 * @param code           mã 6 chữ số hiện tại
 * @param qrContent      nội dung để mã hóa vào QR (hiện bằng chính {@code code})
 * @param periodSeconds  chu kỳ đổi mã (giây)
 * @param validForSeconds số giây còn lại trước khi mã đổi
 */
public record CheckpointCodeResponse(
        String code,
        String qrContent,
        int periodSeconds,
        int validForSeconds) {
}
