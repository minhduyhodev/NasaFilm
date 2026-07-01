
## 1. Auth Module

### 1.1 Login

- [ ] Mở trang `/login`
- [ ] Màn hình login hiển thị đủ email, password, remember me, forgot password, social buttons
- [ ] Login với tài khoản hợp lệ
- [ ] Token được lưu sau khi đăng nhập
- [ ] User được redirect về trang sau login
- [ ] Login sai mật khẩu
- [ ] Hiển thị lỗi rõ ràng, không crash trang
- [ ] Bấm nút login khi bỏ trống email/password
- [ ] Validate hiện đúng thông báo

### 1.2 Register

- [ ] Mở trang `/register`
- [ ] Màn hình register hiển thị đủ full name, email, phone, password, confirm password, terms
- [ ] Nhập full name ngắn hơn 2 ký tự
- [ ] Nhập email sai format
- [ ] Nhập phone sai format
- [ ] Nhập password yếu
- [ ] Password strength bar phản hồi đúng
- [ ] Password và confirm password không khớp
- [ ] Bỏ chọn terms rồi submit
- [ ] Đăng ký với dữ liệu hợp lệ

### 1.3 Forgot / Reset Password

- [ ] Mở trang `/forgot-password`
- [ ] Nhập email hợp lệ và submit
- [ ] Hiển thị trạng thái gửi thành công hoặc message phù hợp
- [ ] Mở trang `/reset-password`
- [ ] Nhập token không hợp lệ
- [ ] Nhập password mới và confirm password
- [ ] Reset thành công thì có thông báo và redirect đúng

### 1.4 Protected Route

- [ ] Logout khỏi hệ thống
- [ ] Truy cập trang cần đăng nhập khi chưa login
- [ ] Bị redirect về `/login`
- [ ] Login xong vào lại trang protected được

---

## 2. User / Profile Module

- [ ] Mở trang profile sau khi login
- [ ] Thông tin user hiển thị đúng
- [ ] Ảnh đại diện hiển thị đúng hoặc fallback hợp lệ
- [ ] Update profile thành công
- [ ] Upload avatar thành công
- [ ] Reload trang vẫn giữ trạng thái đăng nhập
- [ ] Logout xóa token và user state

---

## 3. Home / Public Movies Module

- [ ] Mở trang home
- [ ] Hero section hiển thị đúng
- [ ] Danh sách phim đang chiếu hiển thị
- [ ] Danh sách phim sắp chiếu hiển thị
- [ ] Card phim mở đúng detail page
- [ ] Filter / search hoạt động nếu có
- [ ] Trang chi tiết phim hiển thị trailer, mô tả, cast, media
- [ ] Không có lỗi console khi đổi tab hoặc scroll

---

## 4. Booking Module

### 4.1 Seat Map

- [ ] Mở trang đặt vé / seat map
- [ ] Sơ đồ ghế load được
- [ ] Ghế đã booked / holding hiển thị khác ghế trống
- [ ] Chọn ghế và bỏ chọn ghế hoạt động đúng
- [ ] Reload lại xem state ghế có đồng bộ

### 4.2 Confirm Booking

- [ ] Chọn ghế và submit booking
- [ ] Chọn combo nếu có
- [ ] Nhập promotion code nếu có
- [ ] Confirm booking thành công
- [ ] Booking fail thì hiển thị lỗi rõ ràng
- [ ] Thử submit khi chưa chọn ghế

### 4.3 My Bookings / History

- [ ] Mở lịch sử vé cá nhân
- [ ] Danh sách booking load đúng
- [ ] Mở chi tiết vé
- [ ] QR / ticket info hiển thị đúng
- [ ] Cancel booking nếu user có quyền
- [ ] Trạng thái sau cancel phản ánh đúng

### 4.4 Refund

- [ ] Mở luồng xem refund status
- [ ] Pending refund hiển thị đúng
- [ ] Approved / refunded / failed hiển thị đúng
- [ ] Admin xem được danh sách refund chờ xử lý
- [ ] Admin approve refund thành công

---

## 5. VOD / Online Movie Module

- [ ] Mở trang xem online
- [ ] Kiểm tra status movie trước khi play
- [ ] Ticket hợp lệ mới vào được luồng play
- [ ] Heartbeat gửi đều trong lúc xem
- [ ] Resume playback hoạt động
- [ ] Movie hết hạn thì bị chặn xem
- [ ] Xem lại lịch sử VOD
- [ ] Resend ticket email hoạt động nếu có quyền

---

## 6. Admin Module

### 6.1 Dashboard

- [ ] Mở admin dashboard
- [ ] KPI hiển thị
- [ ] Biểu đồ / summary load đúng
- [ ] Không bị 401 khi user không có quyền admin

### 6.2 Users / Staff

- [ ] Mở trang users
- [ ] Danh sách user load đúng
- [ ] Filter theo status hoạt động
- [ ] Update status user thành công
- [ ] Update role user thành công
- [ ] Tìm kiếm user theo keyword hoạt động

### 6.3 Movies

- [ ] Mở trang admin movies
- [ ] Danh sách phim load đúng
- [ ] Tạo phim mới thành công
- [ ] Sửa phim thành công
- [ ] Đổi status phim thành công
- [ ] Xóa phim hoặc ẩn phim đúng rule

### 6.4 Showtimes

- [ ] Mở trang showtimes
- [ ] Danh sách suất chiếu load đúng
- [ ] Filter theo status hoạt động
- [ ] Filter theo cinema / date hoạt động
- [ ] Tạo showtime mới thành công
- [ ] Thử các transition status hợp lệ

### 6.5 Cinemas / Rooms

- [ ] Mở trang cinemas
- [ ] Danh sách cinema load đúng
- [ ] Tạo cinema mới thành công
- [ ] Tạo / sửa room thành công
- [ ] Seat map admin load đúng
- [ ] Thay đổi seat status hoạt động

### 6.6 Vouchers / Combos / Refunds

- [ ] Mở trang vouchers
- [ ] Mở trang combos
- [ ] Mở trang refunds
- [ ] CRUD voucher hoạt động
- [ ] CRUD combo hoạt động
- [ ] Duyệt refund hoạt động

---

## 7. Realtime / Socket Module

- [ ] Mở luồng seat map realtime
- [ ] Mở 2 tab cùng lúc
- [ ] Thay đổi ghế ở tab A, tab B nhận được update
- [ ] Thử disconnect / reconnect socket
- [ ] Không bị duplicate event

---

## 8. Error Handling

- [ ] Không có lỗi đỏ ở Console khi load app
- [ ] 401 tự redirect hoặc refresh đúng
- [ ] 403 hiển thị message phù hợp
- [ ] 404 hiển thị màn hình hoặc message phù hợp
- [ ] API fail không làm sập app
- [ ] Loading state xuất hiện khi chờ API

---

## 9. Responsive Test

- [ ] Test mobile `375px`
- [ ] Test tablet `768px`
- [ ] Test desktop `1440px+`
- [ ] Layout không vỡ
- [ ] Nút bấm đủ dễ chạm
- [ ] Modal không tràn màn hình

---

## 10. Build / Smoke Test

- [ ] Chạy `npm run lint`
- [ ] Chạy `npm run build`
- [ ] Chạy `npm run preview`
- [ ] Mở app build preview và test lại login
- [ ] Kiểm tra console không có lỗi mới

---


