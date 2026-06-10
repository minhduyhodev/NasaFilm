# 🔌 THIẾT KẾ RESTFUL APIs CHI TIẾT (FULL-SYSTEM API SPECIFICATION)
## Dự án: Hệ thống Quản lý Rạp Chiếu Phim THDPV Movie Theater

Tài liệu này định nghĩa chi tiết toàn bộ các API Endpoints cần thiết để xây dựng và kết nối hoàn chỉnh hệ thống Client-Server cho ứng dụng THDPV Movie Theater.

---

## 📌 Quy chuẩn chung (General Standards)

* **Base URL:** `/api`
* **Định dạng dữ liệu:** `application/json`
* **Xác thực:** Sử dụng Bearer Token (JWT) truyền qua Header `Authorization: Bearer <token>`.
* **Mã hóa mật khẩu:** `BCrypt` ở tầng cơ sở dữ liệu.
* **Thời gian chuẩn:** ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

## 🔑 1. Phân hệ Xác thực & Người dùng (Authentication & User Profile)

### **1.1. Đăng nhập (Login)**
* **Endpoint:** `POST /api/login`
* **Quyền truy cập:** Public
* **Body Request:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePassword123!"
}
```
* **Response Success (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-uuid-value",
  "userId": "e4a2d592-3a5f-4a0b-9cf9-79860b29ff5e",
  "fullName": "Nguyen Van A",
  "email": "customer@example.com",
  "roles": ["CUSTOMER"],
  "tokenType": "Bearer"
}
```

### **1.2. Đăng ký (Register)**
* **Endpoint:** `POST /api/register`
* **Quyền truy cập:** Public
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
  "userId": "e4a2d592-3a5f-4a0b-9cf9-79860b29ff5e"
}
```

### **1.3. Làm mới Token (Refresh Token)**
* **Endpoint:** `POST /api/refresh`
* **Quyền truy cập:** Public (kèm Refresh Token hợp lệ)
* **Body Request:**
```json
{
  "refreshToken": "refresh-token-uuid-value"
}
```
* **Response Success (200 OK):**
```json
{
  "accessToken": "new-access-token-jwt",
  "refreshToken": "new-refresh-token-uuid",
  "tokenType": "Bearer"
}
```

### **1.4. Yêu cầu Quên mật khẩu (Forgot Password)**
* **Endpoint:** `POST /api/forgot-password`
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

### **1.5. Đặt lại Mật khẩu (Reset Password)**
* **Endpoint:** `POST /api/reset-password`
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

### **1.6. Lấy thông tin cá nhân (Get Personal Profile)**
* **Endpoint:** `GET /api/users/me`
* **Quyền truy cập:** Đã đăng nhập (`CUSTOMER` / `STAFF` / `ADMIN`)
* **Response Success (200 OK):**
```json
{
  "id": "e4a2d592-3a5f-4a0b-9cf9-79860b29ff5e",
  "fullName": "Nguyen Van A",
  "email": "nva@example.com",
  "phoneNumber": "0987654321",
  "score": 120,
  "status": "ACTIVE",
  "createdAt": "2026-05-01T08:00:00Z"
}
```

### **1.7. Cập nhật thông tin cá nhân (Update Personal Profile)**
* **Endpoint:** `PUT /api/users/me`
* **Quyền truy cập:** Đã đăng nhập
* **Body Request:**
```json
{
  "fullName": "Nguyen Van B",
  "phoneNumber": "0912345678"
}
```
* **Response Success (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "fullName": "Nguyen Van B",
  "phoneNumber": "0912345678"
}
```

### **1.8. Đổi mật khẩu (Change Password)**
* **Endpoint:** `PUT /api/users/me/password`
* **Quyền truy cập:** Đã đăng nhập
* **Body Request:**
```json
{
  "currentPassword": "SecurePassword123!",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```
* **Response Success (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

---

## 🎬 2. Phân hệ Quản lý Phim & Thể loại (Movies & Genres)

### **2.1. Lấy danh sách phim (Get Movies)**
* **Endpoint:** `GET /api/movies`
* **Quyền truy cập:** Public
* **Query Parameters:**
  - `status`: Trạng thái phim (`NOW_SHOWING` - đang chiếu, `COMING_SOON` - sắp chiếu, `ENDED` - ngừng chiếu).
  - `genreId`: Lọc theo ID thể loại.
  - `search`: Từ khóa tìm kiếm tên phim.
  - `page`: Trang cần lấy (mặc định: 0).
  - `size`: Số lượng phim trên trang (mặc định: 10).
* **Response Success (200 OK):**
```json
{
  "content": [
    {
      "id": "m1-uuid-value",
      "title": "Doctor Strange in the Multiverse of Madness",
      "genre": ["Hành Động", "Viễn Tưởng", "Phiêu Lưu"],
      "duration": 126,
      "releaseDate": "2026-05-06",
      "posterUrl": "https://images.example.com/poster.jpg",
      "status": "NOW_SHOWING",
      "rating": "C13"
    }
  ],
  "totalPages": 5,
  "totalElements": 48,
  "size": 10,
  "number": 0
}
```

### **2.2. Lấy chi tiết thông tin bộ phim (Get Movie Detail)**
* **Endpoint:** `GET /api/movies/{id}`
* **Quyền truy cập:** Public
* **Response Success (200 OK):**
```json
{
  "id": "m1-uuid-value",
  "title": "Doctor Strange in the Multiverse of Madness",
  "description": "Stephen Strange đối mặt với những hiểm họa đa vũ trụ mới...",
  "genre": ["Hành Động", "Viễn Tưởng", "Phiêu Lưu"],
  "duration": 126,
  "releaseDate": "2026-05-06",
  "director": "Sam Raimi",
  "cast": "Benedict Cumberbatch, Elizabeth Olsen",
  "posterUrl": "https://images.example.com/poster.jpg",
  "trailerUrl": "https://youtube.com/embed/xyz",
  "status": "NOW_SHOWING",
  "rating": "C13",
  "language": "Phụ đề Tiếng Việt"
}
```

### **2.3. Lấy danh sách thể loại phim (Get Genres)**
* **Endpoint:** `GET /api/genres`
* **Quyền truy cập:** Public
* **Response Success (200 OK):**
```json
[
  { "id": 1, "name": "Hành Động" },
  { "id": 2, "name": "Kinh Dị" },
  { "id": 3, "name": "Tình Cảm" }
]
```

### **2.4. [ADMIN] Thêm mới phim (Create Movie)**
* **Endpoint:** `POST /api/admin/movies`
* **Quyền truy cập:** `ADMIN` / `STAFF`
* **Body Request:**
```json
{
  "title": "Avatar 3",
  "description": "Hành trình tiếp theo trên hành tinh Pandora...",
  "genreIds": [1, 2],
  "duration": 160,
  "releaseDate": "2026-12-18",
  "director": "James Cameron",
  "cast": "Sam Worthington, Zoe Saldana",
  "posterUrl": "https://images.example.com/avatar3.jpg",
  "trailerUrl": "https://youtube.com/embed/abc",
  "status": "COMING_SOON",
  "rating": "P",
  "language": "Lồng tiếng"
}
```
* **Response Success (201 Created):**
```json
{
  "message": "Movie created successfully",
  "id": "m2-uuid-value"
}
```

### **2.5. [ADMIN] Cập nhật thông tin phim (Update Movie)**
* **Endpoint:** `PUT /api/admin/movies/{id}`
* **Quyền truy cập:** `ADMIN` / `STAFF`
* **Body Request:** (tương tự như POST)
* **Response Success (200 OK):**
```json
{
  "message": "Movie updated successfully"
}
```

### **2.6. [ADMIN] Xóa mềm phim (Delete/Deactivate Movie)**
* **Endpoint:** `DELETE /api/admin/movies/{id}`
* **Quyền truy cập:** `ADMIN`
* **Response Success (200 OK):**
```json
{
  "message": "Movie archived successfully"
}
```

---

## 🏛️ 3. Phân hệ Quản lý Rạp, Phòng & Ghế (Cinemas, Rooms & Seats)

### **3.1. Lấy danh sách rạp chiếu (Get Cinemas)**
* **Endpoint:** `GET /api/cinemas`
* **Quyền truy cập:** Public
* **Response Success (200 OK):**
```json
[
  {
    "id": "c1-uuid-value",
    "name": "THDPV Cinema Landmark 81",
    "address": "Tòa nhà Landmark 81, Quận Bình Thạnh, TP.HCM",
    "phoneNumber": "02873008888"
  }
]
```

### **3.2. Lấy sơ đồ ghế tĩnh của phòng chiếu (Get Room Seat Template)**
* **Endpoint:** `GET /api/rooms/{id}/layout`
* **Quyền truy cập:** Public / Staff
* **Mô tả:** Lấy thông tin cấu hình ghế mặc định (Hàng, Cột, Loại ghế: Thường, VIP, Đôi) của phòng chiếu cụ thể.
* **Response Success (200 OK):**
```json
{
  "roomId": "r1-uuid-value",
  "roomName": "Room 05",
  "totalRows": 10,
  "totalCols": 12,
  "seats": [
    { "seatNo": "A01", "rowCode": "A", "colNo": 1, "type": "STANDARD" },
    { "seatNo": "E05", "rowCode": "E", "colNo": 5, "type": "VIP" },
    { "seatNo": "J11", "rowCode": "J", "colNo": 11, "type": "SWEETBOX" }
  ]
}
```

### **3.3. [ADMIN] Thêm mới Rạp chiếu (Create Cinema)**
* **Endpoint:** `POST /api/admin/cinemas`
* **Quyền truy cập:** `ADMIN`
* **Body Request:**
```json
{
  "name": "THDPV Cinema Nha Trang",
  "address": "Số 01 Trần Phú, Nha Trang",
  "phoneNumber": "02583888888"
}
```
* **Response Success (201 Created):**
```json
{
  "message": "Cinema created successfully",
  "id": "c2-uuid-value"
}
```

---

## 📅 4. Phân hệ Suất chiếu & Trạng thái Ghế (Showtimes & Seat Availability)

### **4.1. Lấy lịch chiếu toàn rạp theo ngày (Get All Showtimes by Date)**
* **Endpoint:** `GET /api/showtimes`
* **Quyền truy cập:** Public
* **Query Parameters:**
  - `date`: Định dạng `YYYY-MM-DD` (Bắt buộc).
  - `cinemaId`: Lọc theo rạp cụ thể.
* **Response Success (200 OK):**
```json
[
  {
    "movieId": "m1-uuid-value",
    "movieTitle": "Doctor Strange 2",
    "rating": "C13",
    "duration": 126,
    "shows": [
      {
        "showtimeId": "st1-uuid-value",
        "cinemaName": "Landmark 81",
        "roomName": "Room 02",
        "startTime": "2026-06-02T10:30:00Z",
        "endTime": "2026-06-02T12:36:00Z",
        "price": 85000.0,
        "format": "2D Lồng tiếng"
      }
    ]
  }
]
```

### **4.2. Lấy lịch chiếu của một bộ phim cụ thể (Get Showtimes by Movie)**
* **Endpoint:** `GET /api/showtimes/movie/{movieId}`
* **Quyền truy cập:** Public
* **Query Parameters:**
  - `date`: Định dạng `YYYY-MM-DD` (Mặc định là ngày hiện tại).
* **Response Success (200 OK):** (Trả về danh sách rạp và suất chiếu tương tự cấu trúc 4.1)

### **4.3. Lấy sơ đồ ghế và tình trạng đặt chỗ của suất chiếu (Get Showtime Seat Map)**
* **Endpoint:** `GET /api/showtimes/{id}/seats`
* **Quyền truy cập:** Public
* **Mô tả:** Lấy thông tin vị trí ghế, loại ghế kèm theo trạng thái đặt chỗ thời gian thực để người dùng chọn ghế.
* **Response Success (200 OK):**
```json
{
  "showtimeId": "st1-uuid-value",
  "movieTitle": "Doctor Strange 2",
  "startTime": "2026-06-02T10:30:00Z",
  "roomName": "Room 02",
  "seats": [
    {
      "seatNo": "A01",
      "type": "STANDARD",
      "basePrice": 85000.0,
      "status": "AVAILABLE" 
    },
    {
      "seatNo": "A02",
      "type": "STANDARD",
      "basePrice": 85000.0,
      "status": "BOOKED" 
    },
    {
      "seatNo": "E05",
      "type": "VIP",
      "basePrice": 105000.0,
      "status": "HOLDING" 
    }
  ]
}
```
* **Ý nghĩa trạng thái:**
  - `AVAILABLE`: Ghế trống, có thể đặt.
  - `BOOKED`: Ghế đã thanh toán/đã đặt thành công.
  - `HOLDING`: Ghế đang được giữ tạm thời bởi khách hàng khác (đang thanh toán).

### **4.4. [ADMIN] Khởi tạo suất chiếu mới (Create Showtime)**
* **Endpoint:** `POST /api/admin/showtimes`
* **Quyền truy cập:** `ADMIN` / `STAFF`
* **Body Request:**
```json
{
  "movieId": "m1-uuid-value",
  "roomId": "r1-uuid-value",
  "startTime": "2026-06-02T14:00:00Z",
  "basePrice": 85000.0,
  "format": "2D Phụ đề"
}
```
* **Response Success (201 Created):**
```json
{
  "message": "Showtime created successfully",
  "id": "st2-uuid-value"
}
```

---

## 🍿 5. Phân hệ Bắp nước & Dịch vụ đi kèm (Food, Drinks & Combos)

### **5.1. Lấy danh sách Combo bắp nước (Get Combos)**
* **Endpoint:** `GET /api/combos`
* **Quyền truy cập:** Public
* **Response Success (200 OK):**
```json
[
  {
    "id": "cb1-uuid",
    "name": "Combo Solo",
    "description": "1 Nước ngọt lớn (L) + 1 Bắp ngọt lớn (L)",
    "price": 65000.0,
    "imageUrl": "https://images.example.com/solo.jpg",
    "status": "ACTIVE"
  },
  {
    "id": "cb2-uuid",
    "name": "Combo Couple",
    "description": "2 Nước ngọt lớn (L) + 1 Bắp Caramen/Phô mai lớn (L)",
    "price": 89000.0,
    "imageUrl": "https://images.example.com/couple.jpg",
    "status": "ACTIVE"
  }
]
```

### **5.2. [ADMIN] Thêm Combo bắp nước mới (Create Combo)**
* **Endpoint:** `POST /api/admin/combos`
* **Quyền truy cập:** `ADMIN` / `STAFF`
* **Body Request:**
```json
{
  "name": "Combo Family",
  "description": "3 Nước ngọt lớn + 2 Bắp lớn + 1 Snack Khoai tây",
  "price": 139000.0,
  "imageUrl": "https://images.example.com/family.jpg",
  "status": "ACTIVE"
}
```
* **Response Success (201 Created):**
```json
{
  "message": "Combo created successfully",
  "id": "cb3-uuid"
}
```

---

## 🎟️ 6. Phân hệ Đặt vé & Giao dịch (Bookings & Transactions)

### **6.1. Thực hiện tạo hóa đơn tạm & Giữ ghế (Create Temporary Booking)**
* **Endpoint:** `POST /api/bookings`
* **Quyền truy cập:** Khách hàng (`CUSTOMER` / yêu cầu JWT) hoặc Nhân viên bán vé tại quầy (`STAFF`)
* **Mô tả:** Giữ tạm các ghế được chọn trong vòng 10 phút. Hết thời gian này nếu không thanh toán, ghế tự động chuyển về trạng thái `AVAILABLE`.
* **Body Request:**
```json
{
  "showtimeId": "st1-uuid-value",
  "seats": ["E05", "E06"],
  "combos": [
    {
      "comboId": "cb1-uuid",
      "quantity": 1
    }
  ]
}
```
* **Response Success (201 Created):**
```json
{
  "bookingId": "b1-uuid-value",
  "holdExpiredAt": "2026-06-03T09:10:00Z",
  "ticketPriceTotal": 210000.0,
  "comboPriceTotal": 65000.0,
  "totalAmount": 275000.0,
  "status": "PENDING"
}
```

### **6.2. Lấy chi tiết thông tin hóa đơn vé đã mua (Get Booking Details)**
* **Endpoint:** `GET /api/bookings/{id}`
* **Quyền truy cập:** Chủ hóa đơn (`CUSTOMER`) hoặc Nhân viên soát vé (`STAFF` / `ADMIN`)
* **Response Success (200 OK):**
```json
{
  "bookingId": "b1-uuid-value",
  "movieTitle": "Doctor Strange 2",
  "cinemaName": "Landmark 81",
  "roomName": "Room 02",
  "startTime": "2026-06-02T10:30:00Z",
  "seats": ["E05", "E06"],
  "combos": [
    { "comboName": "Combo Solo", "quantity": 1 }
  ],
  "totalAmount": 275000.0,
  "status": "PAID",
  "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?data=booking_b1-uuid-value",
  "createdAt": "2026-06-03T09:01:23Z"
}
```

### **6.3. Xem lịch sử đặt vé cá nhân (Get Booking History)**
* **Endpoint:** `GET /api/bookings/my-history`
* **Quyền truy cập:** `CUSTOMER` (yêu cầu JWT)
* **Response Success (200 OK):**
```json
[
  {
    "bookingId": "b1-uuid-value",
    "movieTitle": "Doctor Strange 2",
    "startTime": "2026-06-02T10:30:00Z",
    "totalAmount": 275000.0,
    "status": "PAID",
    "createdAt": "2026-06-03T09:01:23Z"
  }
]
```

### **6.4. Hủy hóa đơn giữ chỗ (Cancel Booking)**
* **Endpoint:** `PUT /api/bookings/{id}/cancel`
* **Quyền truy cập:** Đã đăng nhập (`CUSTOMER` hủy trong khi giữ chỗ, hoặc `STAFF`/`ADMIN` xử lý hoàn trả)
* **Response Success (200 OK):**
```json
{
  "message": "Booking has been cancelled successfully, seats are released."
}
```

---

## 💳 7. Phân hệ Tích hợp Thanh toán (Payment Integration)

### **7.1. Tạo URL Cổng Thanh toán VNPAY/MOMO (Generate Payment Gate URL)**
* **Endpoint:** `POST /api/payments/create-url`
* **Quyền truy cập:** `CUSTOMER` (yêu cầu JWT)
* **Body Request:**
```json
{
  "bookingId": "b1-uuid-value",
  "paymentMethod": "VNPAY" 
}
```
* **Response Success (200 OK):**
```json
{
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=27500000..."
}
```

### **7.2. Nhận phản hồi trạng thái từ VNPAY/MOMO (Payment Return/Callback)**
* **Endpoint:** `GET /api/payments/callback`
* **Quyền truy cập:** Public (Được gọi tự động bởi Redirect của cổng thanh toán và xác thực qua Secure Hash)
* **Query Parameters:** Các tham số đặc trưng của MOMO/VNPAY (e.g. `vnp_ResponseCode`, `vnp_SecureHash`).
* **Mô tả:** API thực hiện kiểm tra chữ ký bảo mật checksum. Nếu giao dịch thành công (`vnp_ResponseCode == 00`), cập nhật trạng thái hóa đơn Booking tương ứng thành `PAID` và tạo mã vé QR Code.
* **Response Success (200 OK):** (Redirect người dùng về màn hình kết quả thanh toán trên FE kèm trạng thái).

---

## 📊 8. Phân hệ Báo cáo & Thống kê - Quản trị (Admin Analytics & Dashboard)

### **8.1. Thống kê Doanh thu Tổng quan (Revenue Statistics Summary)**
* **Endpoint:** `GET /api/admin/dashboard/summary`
* **Quyền truy cập:** `ADMIN`
* **Query Parameters:**
  - `startDate`: Định dạng `YYYY-MM-DD`
  - `endDate`: Định dạng `YYYY-MM-DD`
* **Response Success (200 OK):**
```json
{
  "totalRevenue": 145890000.0,
  "ticketsSold": 1250,
  "combosSold": 480,
  "newUsers": 125
}
```

### **8.2. Biểu đồ doanh thu theo phim (Revenue by Movie)**
* **Endpoint:** `GET /api/admin/dashboard/movies-revenue`
* **Quyền truy cập:** `ADMIN`
* **Response Success (200 OK):**
```json
[
  { "movieId": "m1-uuid-value", "movieTitle": "Doctor Strange 2", "revenue": 89450000.0 },
  { "movieId": "m2-uuid-value", "movieTitle": "Avatar 3", "revenue": 56440000.0 }
]
```

### **8.3. Tỷ lệ lấp đầy ghế theo suất chiếu (Occupancy Rate)**
* **Endpoint:** `GET /api/admin/dashboard/occupancy-rate`
* **Quyền truy cập:** `ADMIN`
* **Response Success (200 OK):**
```json
[
  {
    "showtimeId": "st1-uuid-value",
    "movieTitle": "Doctor Strange 2",
    "startTime": "2026-06-02T10:30:00Z",
    "totalSeats": 120,
    "bookedSeats": 96,
    "occupancyPercentage": 80.0
  }
]
```
