package com.thdpv.movietheater.common.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public enum ErrorCode {

    // ── 2xx SUCCESS ─────────────────────────────────────────────────────────
    SUCCESS(200, "Thành công", HttpStatus.OK),
    CREATED(201, "Tạo thành công", HttpStatus.CREATED),
    NO_CONTENT(204, "Không có dữ liệu", HttpStatus.NO_CONTENT),

    // ── 400 Bad Request ─────────────────────────────────────────────────────
    BAD_REQUEST(400, "Request không hợp lệ", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(400, "Dữ liệu không hợp lệ", HttpStatus.BAD_REQUEST),

    // ── 401 Unauthorized ────────────────────────────────────────────────────
    UNAUTHORIZED(401, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(401, "Token đã hết hạn", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID(401, "Token không hợp lệ", HttpStatus.UNAUTHORIZED),

    // ── 403 Forbidden ───────────────────────────────────────────────────────
    FORBIDDEN(403, "Không có quyền truy cập", HttpStatus.FORBIDDEN),

    // ── 404 Not Found ───────────────────────────────────────────────────────
    NOT_FOUND(404, "Không tìm thấy", HttpStatus.NOT_FOUND),
    USER_NOT_FOUND(404, "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    PRODUCT_NOT_FOUND(404, "Sản phẩm không tồn tại", HttpStatus.NOT_FOUND),
    ORDER_NOT_FOUND(404, "Đơn hàng không tồn tại", HttpStatus.NOT_FOUND),

    // ── 409 Conflict ────────────────────────────────────────────────────────
    CONFLICT(409, "Dữ liệu đã tồn tại", HttpStatus.CONFLICT),
    EMAIL_ALREADY_EXISTS(409, "Email đã được sử dụng", HttpStatus.CONFLICT),
    PHONE_ALREADY_EXISTS(409, "Số điện thoại đã tồn tại", HttpStatus.CONFLICT),

    // ── 5xx Server Error ────────────────────────────────────────────────────
    INTERNAL_ERROR(500, "Lỗi hệ thống", HttpStatus.INTERNAL_SERVER_ERROR),
    DATABASE_ERROR(500, "Lỗi cơ sở dữ liệu", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
