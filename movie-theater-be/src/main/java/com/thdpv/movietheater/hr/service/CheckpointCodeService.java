package com.thdpv.movietheater.hr.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.hr.dto.response.CheckpointCodeResponse;

/**
 * Sinh & xác thực "mã điểm danh" xoay theo thời gian (TOTP-like) dùng cho check-in/out.
 *
 * <p>Admin hiển thị mã dưới dạng QR tại quầy; mã tự đổi sau mỗi {@link #PERIOD_SECONDS} giây.
 * Nhân viên phải quét/nhập đúng mã hiện hành mới chấm công được → chứng minh có mặt tại chỗ.
 * Khi xác thực chấp nhận thêm chu kỳ liền trước/sau để bù lệch đồng hồ và thời gian thao tác.</p>
 */
@Service
public class CheckpointCodeService {

    /** Chu kỳ đổi mã (giây). */
    private static final long PERIOD_SECONDS = 60;
    private static final int DIGITS = 6;
    private static final int MOD = 1_000_000;
    private static final String HMAC_ALGO = "HmacSHA256";

    private final byte[] key;

    public CheckpointCodeService(@Value("${app.jwt.secret}") String jwtSecret) {
        // Dẫn xuất khóa riêng cho mục đích điểm danh, tách biệt với khóa JWT.
        this.key = ("hr-checkpoint::" + (jwtSecret == null ? "" : jwtSecret))
                .getBytes(StandardCharsets.UTF_8);
    }

    /** Mã hiện hành. */
    public String currentCode() {
        return codeForCounter(currentCounter());
    }

    /** Kiểm tra mã do nhân viên nhập/quét, chấp nhận chu kỳ trước/hiện tại/sau. */
    public boolean verify(String code) {
        if (code == null) {
            return false;
        }
        String normalized = code.trim();
        if (!normalized.matches("\\d{" + DIGITS + "}")) {
            return false;
        }
        long counter = currentCounter();
        for (long c = counter - 1; c <= counter + 1; c++) {
            if (constantTimeEquals(normalized, codeForCounter(c))) {
                return true;
            }
        }
        return false;
    }

    /** Thông tin để hiển thị QR + đếm ngược tại quầy. */
    public CheckpointCodeResponse currentDisplay() {
        long now = Instant.now().getEpochSecond();
        long counter = now / PERIOD_SECONDS;
        long remaining = PERIOD_SECONDS - (now % PERIOD_SECONDS);
        String code = codeForCounter(counter);
        return new CheckpointCodeResponse(code, code, (int) PERIOD_SECONDS, (int) remaining);
    }

    private long currentCounter() {
        return Instant.now().getEpochSecond() / PERIOD_SECONDS;
    }

    private String codeForCounter(long counter) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(key, HMAC_ALGO));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(counter).array());
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);
            return String.format("%06d", binary % MOD);
        } catch (Exception ex) {
            throw new IllegalStateException("Không tạo được mã điểm danh", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
