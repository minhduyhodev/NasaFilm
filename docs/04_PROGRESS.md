# 📈 TIẾN ĐỘ THỰC HIỆN DỰ ÁN (PROJECT PROGRESS) - THDPV Movie Theater

Tài liệu này theo dõi sát sao tiến độ phát triển của dự án **THDPV Movie Theater** qua các giai đoạn, từ cơ sở hạ tầng xác thực ban đầu đến các tính năng nghiệp vụ nâng cao.

---

## 🚦 1. Tổng quan Trạng thái Hiện tại

* **Frontend (Client):** Giao diện và luồng nghiệp vụ xác thực (Authentication UI/UX) đã hoàn thiện 100% (giao diện, animation, validate dữ liệu).
* **Backend (Server):** Khung Spring Boot Security, kết nối PostgreSQL, phân quyền và dữ liệu hạt giống (DataSeeder) đã hoàn thiện. API Đăng nhập (`/api/login`) đã sẵn sàng hoạt động.
* **Tình trạng Tích hợp:** Đang ở giai đoạn kết nối các tính năng còn lại của hệ thống xác thực và chuẩn bị mở rộng sang phần nghiệp vụ chiếu phim.

---

## 📝 2. Bảng Theo dõi Tiến độ Chi tiết

Ký hiệu:  
* [x] **Hoàn thành (Done)**  
* [/] **Đang triển khai (In Progress)**  
* [ ] **Chưa thực hiện (Todo)**  

### **Giai đoạn 1: Xây dựng Nền tảng Xác thực (Authentication Base)**

#### **Phía Frontend (React Client)**
* [x] Tạo layout Cinematic Dark Theme và hiệu ứng Glassmorphism.
* [x] Tạo trang Đăng nhập (`LoginPage`) kèm Remember Me và nút liên kết mạng xã hội.
* [x] Tạo trang Đăng ký (`RegisterPage`) kèm thanh đánh giá độ mạnh mật khẩu trực quan.
* [x] Tạo trang Quên mật khẩu (`ForgotPasswordPage`) và Reset mật khẩu (`ResetPasswordPage`).
* [x] Tạo các Auth Guards (`ProtectedRoute`, `PublicRoute`) bảo vệ đường dẫn riêng tư.
* [x] Hiện thực hóa `validation.ts` chứa Zod Schemas để tự động kiểm soát lỗi biểu mẫu đầu vào.
* [x] Tạo Axios interceptor đính kèm JWT Bearer token tự động vào mọi request.
* [x] Tích hợp `react-toastify` hiển thị thông báo đẹp mắt.

#### **Phía Backend (Spring Boot Server)**
* [x] Khởi tạo khung dự án Spring Boot, tích hợp PostgreSQL Driver và JPA Hibernate.
* [x] Định nghĩa thực thể: `User`, `Role`, `UserRole` cùng các trường UUID và các Enums (`RoleName`, `UserStatus`).
* [x] Viết `DataSeeder` tự động sinh các vai trò (`ADMIN`, `STAFF`, `CUSTOMER`) và tài khoản quản trị mặc định.
* [x] Cấu hình `SecurityConfig` (Spring Security 6) và cơ chế mã hóa mật khẩu `BCrypt`.
* [x] Xây dựng bộ lọc `JwtAuthTokenFilter` và lớp tiện ích `JwtUtils` xử lý tạo, giải mã, validate JWT token.
* [x] Hoàn thiện API đăng nhập: `POST /api/login`.
* [ ] Bổ sung `userId` và `fullName` vào `JwtResponse` DTO trả về sau khi đăng nhập thành công. (Bổ sung)

---

### **Giai đoạn 2: Kết nối & Hoàn thiện Xác thực (Integration Phase)**
* [/] Khắc phục lỗi CORS trên Spring Boot để cho phép React App (Port 5173) gọi API an toàn.
* [/] Cấu hình tệp tin `.env.local` ở Client trỏ URL API chính xác tới Server (`http://localhost:8080/api`).
* [ ] Phát triển API đăng ký tài khoản `POST /api/register` ở Backend.
* [ ] Phát triển API gia hạn token `POST /api/refresh` ở Backend.
* [ ] Tích hợp cơ chế tự động refresh JWT phía Client thông qua Axios Response Interceptor.
* [ ] Phát triển API quên mật khẩu `POST /api/forgot-password` và đặt lại mật khẩu `POST /api/reset-password` ở Backend.
* [ ] Cập nhật `authService.ts` ở Client để kết nối trực tiếp các hàm `register()`, `forgotPassword()`, `resetPassword()` thực tế với Server (thay vì giả lập lỗi như hiện tại).
* [ ] Phát triển API IPN/Callback `GET/POST /api/payments/callback` — cần cấu hình sớm để đối tác thanh toán có thể kiểm thử tích hợp song song với Giai đoạn 3. (Bổ sung)
* [ ] Viết test tự động / kiểm thử thủ công toàn bộ luồng đăng ký → đăng nhập → nhận token → truy cập trang Dashboard bảo mật.

---

### **Giai đoạn 3: Phân hệ Nghiệp vụ Rạp phim (Core Cinema System - Kế hoạch)**

#### **Phía Backend (Server)**
* [ ] Thiết kế cơ sở dữ liệu mở rộng cho: `movies`, `seats`, `showtimes`, `bookings`, `tickets`, `payments`.
* [ ] Phát triển API hồ sơ cá nhân `GET /api/users/me` và `PUT /api/users/me`.
* [ ] Phát triển các API quản trị người dùng cho Admin: `GET /api/admin/users`, `PUT /api/admin/users/{id}/status`, `PUT /api/admin/users/{id}/roles`.
* [ ] Viết các API quản trị (CRUD) cho Phim, Phòng chiếu, Suất chiếu (dành cho ADMIN/STAFF).
* [ ] Phát triển API lấy sơ đồ ghế thời gian thực kèm tình trạng đã đặt/đang giữ của một Suất chiếu cụ thể.
* [ ] Viết API xử lý giao dịch đặt vé (`POST /api/bookings`) tích hợp cơ chế giữ ghế (Hold seats) chống trùng lặp.
* [ ] Phát triển API tạo liên kết thanh toán (`POST /api/payments/create-url`) cho MOMO/VNPAY.
* [ ] Hoàn thiện và kiểm thử end-to-end API IPN/Callback (`GET/POST /api/payments/callback`) để xác thực và cập nhật trạng thái giao dịch tự động.

#### **Phía Frontend (Client)**
* [ ] Xây dựng trang chủ hiển thị danh sách phim Đang chiếu / Sắp chiếu (Carousel + Grid View).
* [ ] Xây dựng trang chi tiết phim kèm mô tả, trailer và danh sách lịch chiếu linh hoạt theo ngày.
* [ ] Xây dựng giao diện phòng chiếu tương tác trực quan (chọn ghế Standard, VIP, Couple với hiệu ứng rạp chiếu phim).
* [ ] Xây dựng màn hình tóm tắt thông tin thanh toán, nhập mã giảm giá và đếm ngược thời gian giữ ghế.
* [ ] Tích hợp giao diện thanh toán Momo/VNPay bằng QR code hoặc chuyển hướng trang.
* [ ] Tạo trang lịch sử vé cá nhân của khách hàng kèm vé điện tử chứa mã QR để soát vé khi vào phòng chiếu.
* [ ] Xây dựng màn hình quản trị nội bộ cho Admin/Staff để cập nhật phim, lịch chiếu và quét QR soát vé.
