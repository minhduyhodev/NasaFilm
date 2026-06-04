package com.thdpv.movietheater.common.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thdpv.movietheater.common.exception.ErrorCode;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private int code;
    private String message;
    private T data;
    private String timestamp;

    private static <T> ApiResponse<T> build(
            boolean success, ErrorCode ec, String customMsg, T data) {
        return ApiResponse.<T>builder()
                .success(success)
                .code(ec.getCode())
                .message(customMsg != null ? customMsg : ec.getMessage())
                .data(data)
                .timestamp(Instant.now().toString())
                .build();
    }

    public static <T> ApiResponse<T> success(T data) {
        return build(true, ErrorCode.SUCCESS, null, data);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return build(true, ErrorCode.SUCCESS, message, data);
    }

    public static <T> ApiResponse<T> created(T data) {
        return build(true, ErrorCode.CREATED, null, data);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return build(false, errorCode, null, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMsg) {
        return build(false, errorCode, customMsg, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, T data) {
        return build(false, errorCode, null, data);
    }
}
