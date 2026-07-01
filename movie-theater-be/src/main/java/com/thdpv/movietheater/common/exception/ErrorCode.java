package com.thdpv.movietheater.common.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public enum ErrorCode {
    SUCCESS(200, "Thanh cong", HttpStatus.OK),
    CREATED(201, "Tao thanh cong", HttpStatus.CREATED),

    BAD_REQUEST(400, "Request khong hop le", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(400, "Du lieu khong hop le", HttpStatus.BAD_REQUEST),

    UNAUTHORIZED(401, "Chua xac thuc", HttpStatus.UNAUTHORIZED),
    INVALID_CREDENTIALS(401, "Email hoac mat khau khong dung", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(401, "Token da het han", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID(401, "Token khong hop le", HttpStatus.UNAUTHORIZED),

    FORBIDDEN(403, "Khong co quyen truy cap", HttpStatus.FORBIDDEN),

    NOT_FOUND(404, "Khong tim thay", HttpStatus.NOT_FOUND),
    USER_NOT_FOUND(404, "Nguoi dung khong ton tai", HttpStatus.NOT_FOUND),
    MOVIE_NOT_FOUND(404, "Phim khong ton tai", HttpStatus.NOT_FOUND),
    BOOKING_NOT_FOUND(404, "Dat ve khong ton tai", HttpStatus.NOT_FOUND),
    SHOWTIME_NOT_FOUND(404, "Suat chieu khong ton tai", HttpStatus.NOT_FOUND),

    CONFLICT(409, "Du lieu da ton tai", HttpStatus.CONFLICT),
    EMAIL_ALREADY_EXISTS(409, "Email da duoc su dung", HttpStatus.CONFLICT),
    PHONE_ALREADY_EXISTS(409, "So dien thoai da ton tai", HttpStatus.CONFLICT),

    VERIFICATION_CODE_INVALID(400, "Ma xac nhan khong hop le hoac da het han", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(500, "Khong the gui email xac nhan", HttpStatus.INTERNAL_SERVER_ERROR),
    USER_ALREADY_ACTIVE(400, "Tai khoan da duoc kich hoat truoc do", HttpStatus.BAD_REQUEST),
    USER_NOT_VERIFIED(401, "Tai khoan chua duoc xac minh qua email", HttpStatus.UNAUTHORIZED),
    ACCOUNT_NOT_ACTIVE(403, "Tai khoan khong o trang thai hoat dong", HttpStatus.FORBIDDEN),
    ACCOUNT_BANNED(403, "Tài khoản của bạn đã bị khóa vĩnh viễn", HttpStatus.FORBIDDEN),
    ACCOUNT_SUSPENDED(403, "Tài khoản của bạn đang tạm thời bị khóa", HttpStatus.FORBIDDEN),

    REVIEW_PURCHASE_REQUIRED(403, "Ban can mua ve rap hoac ve online de danh gia phim nay", HttpStatus.FORBIDDEN),
    REVIEW_NOT_FOUND(404, "Danh gia khong ton tai", HttpStatus.NOT_FOUND),
    REVIEW_BANNED_WORD(400, "Binh luan chua noi dung khong phu hop", HttpStatus.BAD_REQUEST),
    REVIEW_COOLDOWN_ACTIVE(429, "Vui long doi truoc khi gui danh gia moi cho phim nay", HttpStatus.TOO_MANY_REQUESTS),
    REVIEW_RATE_LIMITED(429, "Ban thao tac qua nhanh. Vui long thu lai sau.", HttpStatus.TOO_MANY_REQUESTS),
    REVIEW_ALREADY_REPORTED(409, "Ban da bao cao danh gia nay", HttpStatus.CONFLICT),
    CANNOT_REPORT_OWN_REVIEW(400, "Khong the bao cao danh gia cua chinh ban", HttpStatus.BAD_REQUEST),
    REVIEW_REPORT_NOT_FOUND(404, "Don bao cao khong ton tai", HttpStatus.NOT_FOUND),

    INTERNAL_ERROR(500, "Loi he thong", HttpStatus.INTERNAL_SERVER_ERROR),
    DATABASE_ERROR(500, "Loi co so du lieu", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
