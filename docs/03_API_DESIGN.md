# 🔌 THIẾT KẾ RESTFUL APIs (API DESIGN) - THDPV Movie Theater

Tài liệu này mô tả chi tiết các API Endpoints hiện tại (Module Xác thực) và đề xuất các API Endpoints cần xây dựng thêm để kết nối hoàn chỉnh ứng dụng Client-Server cho hệ thống quản lý rạp chiếu phim THDPV Movie Theater.

---

## 🔑 1. Danh sách API Xác thực (Authentication API)

Các API này phục vụ cho phân hệ Đăng nhập, Đăng ký và Phục hồi mật khẩu. Base URL: `/api`

### **1.1. Đăng nhập (Login)**
* **Endpoint:** `POST /api/auth/login`
* **Mô tả:** Đăng nhập hệ thống bằng email và mật khẩu. Trả về mã JWT để xác thực cho các request tiếp theo.
* **Quyền truy cập:** Công khai (Public).
* **Body Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
* **Response Success (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-value",
  "userId": "e4a2d592-3a5f-4a0b-9cf9-79860b29ff5e",
  "fullName": "System Administrator",
  "email": "admin@example.com",
  "roles": [
    "ADMIN"
  ],
  "tokenType": "Bearer"
}
```
* **Response Error (401 Unauthorized):**
```json
{
  "message": "Bad credentials",
  "status": 401
}
```


---

### **1.1.1. Gia hạn Access Token (Refresh Token)**
* **Endpoint:** `POST /api/auth/refresh`
* **Mô tả:** Cấp mới Access Token khi Access Token hết hạn nhưng Refresh Token vẫn còn hiệu lực.
* **Quyền truy cập:** Public.
* **Body Request:**
```json
{
  "refreshToken": "refresh-token-value"
}
```
* **Response Success (200 OK):**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "tokenType": "Bearer"
}
```

### **1.2. Đăng ký tài khoản (Register - Đang chờ triển khai ở BE)**
* **Endpoint:** `POST /api/auth/register`
* **Mô tả:** Tạo mới một tài khoản khách hàng (`CUSTOMER`).
* **Quyền truy cập:** Công khai (Public).
* **Body Request:**
```json
{
  "fullName": "Nguyen Van A",
  "email": "nva@example.com",
  "phoneNumber": "0987654321",
  "password": "SecurePassword123!"
}
```
* **Response Success (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "e4a2d592-3a5f-4a0b-9cf9-79860b29ff5e",
    "email": "nva@example.com",
    "fullName": "Nguyen Van A",
    "status": "ACTIVE",
    "roles": ["CUSTOMER"]
  }
}
```

---

### **1.3. Yêu cầu Quên mật khẩu (Forgot Password - Đang chờ triển khai ở BE)**
* **Endpoint:** `POST /api/auth/forgot-password`
* **Mô tả:** Gửi email chứa liên kết phục hồi kèm theo mã OTP/Reset Token đến email của người dùng.
* **Body Request:**
```json
{
  "email": "nva@example.com"
}
```
* **Response Success (200 OK):**
```json
{
  "message": "Recovery link sent successfully to your email"
}
```

---

### **1.4. Đặt lại Mật khẩu (Reset Password - Đang chờ triển khai ở BE)**
* **Endpoint:** `POST /api/auth/reset-password`
* **Mô tả:** Người dùng nhập token được gửi trong email để thiết lập mật khẩu mới.
* **Body Request:**
```json
{
  "token": "reset-token-received-from-email",
  "password": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```
* **Response Success (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

---

## 🎬 2. Đề xuất các API nghiệp vụ Rạp Phim (Proposed Core APIs)

Dưới đây là các đầu API đề xuất để mở rộng phát triển ứng dụng:


### **2.0. Phân hệ Người dùng (User Profile API)**

| Method | Endpoint | Quyền truy cập | Mô tả |
|---|---|---|---|
| `GET` | `/api/users/me` | User đã đăng nhập | Lấy thông tin hồ sơ cá nhân |
| `PUT` | `/api/users/me` | User đã đăng nhập | Cập nhật thông tin cá nhân |
| `GET` | `/api/admin/users` | Admin | Danh sách tài khoản người dùng |
| `GET` | `/api/admin/users/{id}` | Admin | Xem chi tiết tài khoản |
| `PUT` | `/api/admin/users/{id}/status` | Admin | Khóa/Mở khóa tài khoản |
| `PUT` | `/api/admin/users/{id}/roles` | Admin | Cập nhật vai trò người dùng |

### **2.1. Phân hệ Phim (Movies API)**
| Method | Endpoint | Quyền truy cập | Mô tả |
|---|---|---|---|
| `GET` | `/api/movies?status=NOW_SHOWING` | Public | Lấy danh sách phim đang chiếu hoặc sắp chiếu |
| `GET` | `/api/movies/{id}` | Public | Lấy chi tiết thông tin bộ phim kèm trailer |
| `POST` | `/api/movies` | Admin / Staff | Thêm mới phim (Tải ảnh poster, trailer) |
| `PUT` | `/api/movies/{id}` | Admin / Staff | Cập nhật thông tin phim |
| `DELETE` | `/api/movies/{id}` | Admin | Xóa mềm phim hoặc chuyển trạng thái ngừng chiếu |

### **2.2. Phân hệ Suất chiếu & Ghế (Showtimes & Seats API)**
| Method | Endpoint | Quyền truy cập | Mô tả |
|---|---|---|---|
| `GET` | `/api/showtimes?date=2026-06-02` | Public | Lấy lịch chiếu theo ngày của toàn rạp |
| `GET` | `/api/showtimes?movie_id={id}` | Public | Lấy lịch chiếu của một bộ phim cụ thể |
| `GET` | `/api/showtimes/{id}/seats` | Public | Lấy sơ đồ ghế và tình trạng ghế trống/đã đặt của suất chiếu đó |
| `POST` | `/api/showtimes` | Admin | Khởi tạo suất chiếu mới (Phòng, phim, giờ chiếu, giá) |

### **2.3. Phân hệ Đặt vé & Giao dịch (Bookings API)**
| Method | Endpoint | Quyền truy cập | Mô tả |
|---|---|---|---|
| `POST` | `/api/bookings` | Customer (Yêu cầu JWT) | Thực hiện chọn ghế và tạo hóa đơn tạm (Hold ghế trong 5-10 phút) |
| `GET` | `/api/bookings/{id}` | Customer (Chủ sở hữu) / Staff | Xem chi tiết thông tin vé đã mua và mã QR Code soát vé |
| `GET` | `/api/bookings/my-history` | Customer (Yêu cầu JWT) | Xem lịch sử mua vé cá nhân của Khách hàng |
| `PUT` | `/api/bookings/{id}/cancel` | Staff / Admin | Hủy vé hoặc đổi trả theo yêu cầu của khách hàng |

### **2.4. Phân hệ Thanh toán (Payment API)**
| Method | Endpoint | Quyền truy cập | Mô tả |
|---|---|---|---|
| `POST` | `/api/payments/create-url` | Customer (Yêu cầu JWT) | Tạo liên kết thanh toán sang MOMO/VNPAY cho một mã Booking cụ thể |
| `GET/POST` | `/api/payments/callback` | Public (Đối tác gọi) | Nhận dữ liệu xác nhận trạng thái thanh toán từ MOMO/VNPAY để cập nhật Booking |

---

## 🛠️ 3. Quy chuẩn phản hồi lỗi (Error Handling Format)

Để Client dễ dàng bắt lỗi và hiển thị thông báo chính xác cho người dùng (ví dụ: Zod Form Validation hoặc Toast Notification), Server cần trả về định dạng lỗi thống nhất:

```json
{
  "message": "Dữ liệu đầu vào không hợp lệ",
  "code": "VALIDATION_FAILED",
  "status": 400,
  "details": {
    "email": "Email đã tồn tại trong hệ thống",
    "password": "Mật khẩu tối thiểu phải chứa ít nhất 1 chữ số"
  }
}
```
* **`message`:** Thông điệp lỗi tổng quan.
* **`code`:** Mã định danh lỗi giúp FE xử lý logic (ví dụ: `EXPIRED_TOKEN`, `SEAT_ALREADY_BOOKED`).
* **`status`:** Mã HTTP Status code (400, 401, 403, 404, 500).
* **`details`:** Bản đồ chi tiết các trường bị lỗi biểu mẫu (nếu có).
