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
    ACCOUNT_NOT_ACTIVE(403, "Tài khoản của bạn hiện đang bị khóa hoặc chưa được kích hoạt.", HttpStatus.FORBIDDEN),
    ACCOUNT_BANNED(403, "Tài khoản của bạn đã bị khóa vĩnh viễn", HttpStatus.FORBIDDEN),
    ACCOUNT_SUSPENDED(403, "Tài khoản của bạn đang tạm thời bị khóa", HttpStatus.FORBIDDEN),

    REVIEW_PURCHASE_REQUIRED(403, "Ban can mua ve rap hoac ve online de danh gia phim nay", HttpStatus.FORBIDDEN),
    REVIEW_NOT_FOUND(404, "Danh gia khong ton tai", HttpStatus.NOT_FOUND),
    REVIEW_BANNED_WORD(400, "Bình luận chứa nội dung không phù hợp. Vui lòng chỉnh sửa và thử lại.",
            HttpStatus.BAD_REQUEST),
    REVIEW_INVALID_VIBE_TAGS(400, "Vibe tag khong hop le hoac vuot qua gioi han", HttpStatus.BAD_REQUEST),
    REVIEW_COOLDOWN_ACTIVE(429, "Vui long doi truoc khi gui danh gia moi cho phim nay", HttpStatus.TOO_MANY_REQUESTS),
    REVIEW_RATE_LIMITED(429, "Ban thao tac qua nhanh. Vui long thu lai sau.", HttpStatus.TOO_MANY_REQUESTS),
    SUPPORT_RATE_LIMITED(429, "Bạn gửi tin nhắn quá nhanh. Vui lòng đợi vài giây rồi thử lại.", HttpStatus.TOO_MANY_REQUESTS),
    SUPPORT_SATISFACTION_NOT_ALLOWED(400, "Chỉ đánh giá được khi ticket đã hoàn tất.", HttpStatus.BAD_REQUEST),
    SUPPORT_ALREADY_RATED(409, "Bạn đã đánh giá ticket này rồi.", HttpStatus.CONFLICT),
    REVIEW_ALREADY_REPORTED(409, "Ban da bao cao danh gia nay", HttpStatus.CONFLICT),
    CANNOT_REPORT_OWN_REVIEW(400, "Khong the bao cao danh gia cua chinh ban", HttpStatus.BAD_REQUEST),
    REVIEW_REPORT_NOT_FOUND(404, "Don bao cao khong ton tai", HttpStatus.NOT_FOUND),

    HR_SHIFT_NOT_FOUND(404, "Ca làm việc không tồn tại", HttpStatus.NOT_FOUND),
    HR_ASSIGNMENT_NOT_FOUND(404, "Phân ca không tồn tại", HttpStatus.NOT_FOUND),
    HR_ASSIGNMENT_CONFLICT(409, "Nhân viên đã được xếp ca này trong ngày", HttpStatus.CONFLICT),
    HR_ASSIGNMENT_OVERLAP(409, "Nhân viên bị xếp trùng giờ với một ca khác", HttpStatus.CONFLICT),
    HR_ASSIGNMENT_REST(409, "Không đủ thời gian nghỉ tối thiểu giữa hai ca", HttpStatus.CONFLICT),
    HR_ASSIGNMENT_DAILY_LIMIT(409, "Vượt quá số giờ làm tối đa trong ngày", HttpStatus.CONFLICT),
    HR_ASSIGNMENT_PAST_DATE(400, "Không thể xếp ca cho ngày đã qua", HttpStatus.BAD_REQUEST),
    HR_ASSIGNMENT_LOCKED(400, "Không thể sửa/xóa ca đang diễn ra hoặc đã qua", HttpStatus.BAD_REQUEST),
    HR_ATTENDANCE_NOT_FOUND(404, "Bản ghi chấm công không tồn tại", HttpStatus.NOT_FOUND),
    HR_ATTENDANCE_LOCKED(400, "Chấm công đã duyệt — không thể chỉnh sửa hoặc thay đổi trạng thái", HttpStatus.BAD_REQUEST),
    HR_ALREADY_CHECKED_IN(409, "Bạn đã check-in ca này rồi", HttpStatus.CONFLICT),
    HR_NOT_CHECKED_IN(400, "Chưa check-in nên không thể check-out", HttpStatus.BAD_REQUEST),
    HR_ALREADY_CHECKED_OUT(409, "Ca này đã được check-out", HttpStatus.CONFLICT),
    HR_CHECK_IN_WINDOW_INVALID(400, "Chưa tới giờ hoặc đã quá giờ check-in của ca này", HttpStatus.BAD_REQUEST),
    HR_CHECKPOINT_CODE_INVALID(400, "Mã điểm danh không đúng hoặc đã hết hạn. Vui lòng quét lại mã QR tại quầy.", HttpStatus.BAD_REQUEST),
    HR_PROFILE_NOT_FOUND(404, "Hồ sơ lương nhân viên không tồn tại", HttpStatus.NOT_FOUND),
    HR_PERIOD_NOT_FOUND(404, "Kỳ lương không tồn tại", HttpStatus.NOT_FOUND),
    HR_PERIOD_EXISTS(409, "Kỳ lương của tháng này đã tồn tại", HttpStatus.CONFLICT),
    HR_PAYSLIP_NOT_FOUND(404, "Phiếu lương không tồn tại", HttpStatus.NOT_FOUND),
    HR_PAYROLL_STATE_INVALID(400, "Thao tác không hợp lệ với trạng thái kỳ lương hiện tại", HttpStatus.BAD_REQUEST),

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
