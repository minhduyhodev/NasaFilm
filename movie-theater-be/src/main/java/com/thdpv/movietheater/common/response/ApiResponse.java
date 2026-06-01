package com.thdpv.movietheater.common.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thdpv.movietheater.common.exception.ErrorCode;

import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // field null sẽ không xuất hiện trong JSON
public class ApiResponse<T> {

    private boolean success; // JSend-style: true/false — frontend check cái này đầu tiên
    private int code; // giống HTTP status code
    private String message; // mô tả để hiển thị hoặc log
    private T data; // payload — null khi lỗi
    private String timestamp; // ISO-8601, tiện debug và audit log

    // ── Private helper — toàn bộ logic build tập trung ở đây ────────────────
    private static <T> ApiResponse<T> build(
            boolean success, ErrorCode ec, String customMsg, T data) {
        return ApiResponse.<T>builder()
                .success(success)
                .code(ec.getCode()) // lấy từ ErrorCode
                .message(customMsg != null ? customMsg : ec.getMessage()) // lấy từ ErrorCode
                .data(data)
                .timestamp(Instant.now().toString())
                .build();
    }

    // ── Public factory methods ───────────────────────────────────────────────
    public static <T> ApiResponse<T> success(T data) {
        return build(true, ErrorCode.SUCCESS, null, data);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return build(true, ErrorCode.SUCCESS, message, data);
    }

    public static <T> ApiResponse<T> created(T data) {
        return build(true, ErrorCode.CREATED, null, data);
    }

    public static <T> ApiResponse<T> noContent() {
        return build(true, ErrorCode.NO_CONTENT, null, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return build(false, errorCode, null, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMsg) {
        return build(false, errorCode, customMsg, null);
    }

    // Overload đặc biệt: khi cần trả data kèm lỗi (VD: validation trả map lỗi)
    public static <T> ApiResponse<T> error(ErrorCode errorCode, T data) {
        return build(false, errorCode, null, data);
    }
}
