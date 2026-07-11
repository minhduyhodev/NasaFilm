# Kịch bản hỗ trợ NASA BOT — Admin / Staff

Tài liệu tham chiếu cho 3 danh mục: **Tài khoản**, **Khuyến mãi**, **Hội viên**.  
Bám sát luồng widget (`NasaAiAssistantWidget`) và nghiệp vụ backend hiện tại.

---

## Luồng chung (khách hàng)

1. Mở NASA BOT → chọn danh mục (chip)
2. Gõ mô tả (tối thiểu **15 ký tự**)
3. Xác nhận trên card → **Gửi yêu cầu** / **Sửa** / **Hủy**
4. Có staff online → ưu tiên chat live (timeout **3 phút**)
5. Không có staff / timeout / từ chối → ticket `PENDING` → admin xử lý tại `/admin/support`

**Admin cần thấy:** danh mục, email, họ tên, mô tả gốc, hội thoại realtime.

---

## 👤 Tài khoản — đăng nhập, OTP, mật khẩu

### Phạm vi hệ thống

| Tính năng | Chi tiết |
|-----------|----------|
| Đăng nhập | Email + mật khẩu, Ghi nhớ tài khoản, Google OAuth |
| Đăng ký | Họ tên, email, SĐT, mật khẩu → OTP **6 số** qua email |
| OTP | Cooldown giữa các lần gửi; khóa tạm nếu nhập sai nhiều lần |
| Quên MK | `/forgot-password` → link reset qua email |
| Kích hoạt | `/activate-account?token=...` |
| Profile | Cập nhật họ tên, SĐT; xem điểm |

**Mật khẩu:** tối thiểu 8 ký tự, có chữ hoa + thường + số + ký tự đặc biệt.

### Câu hỏi gợi ý khi user chọn danh mục

> Mô tả lỗi tài khoản (đăng nhập, OTP, mật khẩu). Ghi email đăng ký và thông báo lỗi nếu có.

### FAQ — NASA BOT trả lời trước khi mở ticket

| Câu hỏi | Trả lời mẫu |
|---------|-------------|
| Quên mật khẩu? | Vào **Quên mật khẩu** → nhập email → kiểm tra hộp thư (kể cả spam) → link reset. |
| Không nhận OTP? | OTP gửi email đăng ký; có thời gian chờ; sai nhiều lần có thể khóa tạm. |
| Không đăng nhập được? | Kiểm tra email/MK, Caps Lock, tài khoản đã kích hoạt; thử Google nếu đã liên kết. |
| Cập nhật thông tin? | Vào **Profile** sửa họ tên, SĐT. |

### Mẫu mô tả ticket (khách)

```
Không nhận OTP đăng ký. Email: user@example.com. Đã thử 3 lần, spam trống. Lỗi lúc 01:45 11/07/2026.
```

### Admin — checklist

| Vấn đề | Kiểm tra | Hành động |
|--------|----------|-----------|
| Không nhận OTP | Email đúng? Cooldown? Bị khóa OTP? | Gửi lại OTP / mở khóa |
| Quên MK | Email tồn tại? | Gửi lại link reset |
| Không đăng nhập | Activated? Bị khóa? | Reset MK / kích hoạt |
| Google OAuth | Email trùng? | Hướng dẫn phương thức đúng |

### Mẫu phản hồi admin

> Chào bạn, mình đã kiểm tra tài khoản **user@example.com**. OTP đã được gửi lại — vui lòng kiểm tra email (kể cả spam) trong 5 phút. Nếu vẫn không nhận được, phản hồi lại để mình hỗ trợ tiếp.

---

## 🎁 Khuyến mãi — voucher, combo, mã giảm giá

### Phạm vi hệ thống

| Loại | Chi tiết |
|------|----------|
| Voucher/mã KM | Nhập ở bước **thanh toán**; giảm % hoặc số tiền cố định |
| Voucher đổi điểm | Phải **đổi điểm trong Offers** → vào ví → mới dùng lúc thanh toán |
| Voucher trực tiếp | Nhập mã khi thanh toán, không cần đổi điểm |
| Combo bắp nước | Chọn kèm vé; giảm theo hạng hội viên |
| Trang Offers | Xem / đổi voucher |

**Lỗi hệ thống thường gặp:**

- `Voucher không còn hiệu lực` / `đã hết hạn` / `chưa bắt đầu hiệu lực`
- `Voucher đã hết lượt sử dụng`
- `Bạn chưa đủ hạng thành viên để đổi voucher này`
- `Không đủ điểm để đổi voucher`
- `Bạn cần đổi điểm để kích hoạt voucher trước khi sử dụng`

### Câu hỏi gợi ý khi user chọn danh mục

> Mô tả vấn đề khuyến mãi. Ghi mã voucher/combo, mã đơn và thông báo lỗi nếu có.

### FAQ — NASA BOT

| Câu hỏi | Trả lời mẫu |
|---------|-------------|
| Mã không áp dụng? | Kiểm tra chính tả, hạn, điều kiện hạng/đơn tối thiểu. Voucher đổi điểm phải đổi trong Offers trước. |
| Combo không giảm? | Friend (≥5.000 lifetime) giảm **10%** combo; VIP (≥10.000) giảm **15%**. |
| Hết hạn / hết lượt? | Xem chương trình tại **Offers**. |
| Chưa đủ hạng? | Một số voucher yêu cầu NASA Friend hoặc VIP. |

### Mẫu mô tả ticket (khách)

```
Mã SUMMER2026 không áp dụng khi thanh toán vé 120.000đ. Báo "Voucher không còn hiệu lực".
Email: user@example.com. Thử lúc 01:40 11/07/2026.
```

### Admin — checklist

| Vấn đề | Kiểm tra | Hành động |
|--------|----------|-----------|
| Không áp dụng | Status ACTIVE? Trong hạn? Hết lượt? | Giải thích / gia hạn |
| Chưa đủ hạng | `lifetimeScore` vs `minScore` | Hướng dẫn nâng hạng |
| Chưa đổi điểm | `requiresPointRedemption` | Hướng dẫn đổi Offers |
| Combo không giảm | Lifetime score | Giải thích mốc 5k/10k |

---

## 👑 Hội viên — điểm thưởng, hạng, quyền lợi

### Quy tắc nghiệp vụ (code)

| Khái niệm | Quy tắc |
|-----------|---------|
| `score` | Điểm có thể tiêu (đổi voucher, trừ khi thanh toán) |
| `lifetimeScore` | Điểm tích lũy → xác định **hạng** |
| **NASA Member** | lifetimeScore = 0 |
| **NASA Friend** | lifetimeScore ≥ **5.000** |
| **NASA VIP** | lifetimeScore ≥ **10.000** |
| **Tích điểm** | Sau thanh toán thành công: `floor(tổng tiền thực trả / 10.000)` điểm |
| **Quy đổi** | 1 điểm = 1.000đ (không âm, không vượt giá đơn) |
| **Giảm combo** | Friend 10%, VIP 15% |
| **Hoàn/hủy vé** | Hoàn điểm đã tiêu; trừ điểm đã tích của đơn |
| **Missions** | Nhiệm vụ cộng thêm điểm (EXPLORER, PREMIERE, …) |

### Câu hỏi gợi ý khi user chọn danh mục

> Mô tả vấn đề hội viên. Ghi mã đơn, số điểm hiện tại và thời điểm phát sinh.

### FAQ — NASA BOT

| Câu hỏi | Trả lời mẫu |
|---------|-------------|
| Chưa cộng điểm? | Chỉ cộng khi thanh toán thành công; mỗi 10.000đ = 1 điểm. Kiểm tra Profile sau vài phút. |
| Hạng sai? | Hạng theo **lifetimeScore**, không phải điểm đang có. |
| Dùng điểm? | 1 điểm = 1.000đ; hủy vé → hoàn điểm đã dùng. |
| Quyền lợi? | Giảm combo, voucher theo hạng, Missions cộng điểm. |

### Mẫu mô tả ticket (khách)

```
Mua vé 250.000đ lúc 20:00 10/07 nhưng chưa thấy cộng điểm. Mã đơn BK-xxxxx.
Email: user@example.com. Profile vẫn 120 điểm.
```

### Admin — checklist

| Vấn đề | Kiểm tra | Hành động |
|--------|----------|-----------|
| Chưa cộng điểm | Booking confirmed? `calculateScore` | Cộng bù + score history |
| Hạng sai | `lifetimeScore` | Giải thích / sửa nếu lỗi sync |
| Mất điểm sau hủy | Refund flow | Xác nhận hoàn điểm |
| Mission không cộng | Mission log | Cộng tay nếu đủ điều kiện |

---

## Kịch bản hội thoại mẫu (end-to-end)

### Tài khoản — OTP

```
[User chọn Tài khoản]
Bot:  Mô tả lỗi tài khoản... (tối thiểu 15 ký tự)
User: Đăng ký email xxx@gmail.com, không nhận OTP sau 3 lần. Spam trống. 01:45 11/07.
Bot:  [Card xác nhận]
User: [Gửi yêu cầu]
Admin: Kiểm tra cooldown + trạng thái user → gửi lại OTP / kích hoạt
```

### Khuyến mãi — voucher

```
User: Mã VIP50 báo "chưa đủ hạng". Đơn 180k. Email xxx.
Admin: lifetimeScore = 3200 < 5000 → giải thích cần NASA Friend
```

### Hội viên — điểm

```
User: Thanh toán 320k, profile vẫn 30 điểm. Mã đơn BK-abc.
Admin: Booking confirmed → phải +32 điểm → cộng bù nếu thiếu
```

---

## File liên quan trong codebase

| File | Mục đích |
|------|----------|
| `movie-theater-fe/src/shared/components/NasaAiAssistantWidget.jsx` | Chip danh mục, question/hint |
| `movie-theater-fe/src/shared/constants/systemConfig.js` | `personaPrompt`, `DEFAULT_NASA_BOT_SUPPORT_FAQS` |
| `movie-theater-fe/src/features/admin/pages/NasaBotConfigPage.jsx` | Xem/chỉnh prompt + FAQ |
| `movie-theater-be/.../SupportAiService.java` | AI chat + fallback guided flow |
| `movie-theater-be/.../SystemConfigService.java` | Default config khi cài mới |
| `movie-theater-fe/src/features/admin/pages/SupportInboxPage.jsx` | Admin inbox |

---

## Ghi chú cập nhật prompt

- FAQ mặc định đã gắn vào `personaPrompt` (FE + BE default).
- Admin chỉnh prompt tại **Admin → Cấu hình NASA Bot** hoặc **Config → NASA Bot**.
- Sau khi chỉnh prompt, nhấn **Lưu** để backend `/api/support-ai/chat` dùng bản mới.
