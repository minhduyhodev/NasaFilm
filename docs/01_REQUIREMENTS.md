# 📋 ĐẶC TẢ YÊU CẦU HỆ THỐNG (SYSTEM REQUIREMENTS) - THDPV Movie Theater

Tài liệu này xác định các yêu cầu chức năng (Functional Requirements) và yêu cầu phi chức năng (Non-functional Requirements) cho toàn bộ hệ thống đặt vé xem phim trực tuyến THDPV Movie Theater.

---

## 👥 1. Các Vai trò trong Hệ thống (Actors & Roles)

Hệ thống hỗ trợ 3 nhóm đối tượng người dùng chính với phân quyền truy cập khác nhau:

1. **Khách hàng (CUSTOMER):**
   * Người dùng đăng nhập để xem thông tin phim, đặt vé trực tuyến, chọn ghế, thanh toán và tích điểm thành viên.
   * Xem lịch sử đặt vé cá nhân và quản lý hồ sơ tài khoản.
2. **Nhân viên (STAFF):**
   * Quản lý hoạt động hàng ngày tại rạp: Hỗ trợ soát vé bằng mã QR, cập nhật nhanh tình trạng phòng chiếu/ghế hỏng.
   * Tra cứu thông tin vé của khách hàng khi cần hỗ trợ.
3. **Quản trị viên (ADMIN):**
   * Có toàn quyền quản trị hệ thống: Quản lý danh mục phim, suất chiếu (Showtimes), phòng chiếu (Halls), và cấu hình sơ đồ ghế.
   * Quản lý tài khoản nhân viên (Staff) và tài khoản khách hàng.
   * Thống kê báo cáo doanh thu theo ngày, theo phim, theo rạp.

---

## ⚙️ 2. Yêu cầu Chức năng (Functional Requirements)

### **A. Phân hệ Xác thực & Quản lý Tài khoản (Authentication & Account Management)**
* **Đăng nhập (Login):**
  * Hỗ trợ đăng nhập qua Email và Mật khẩu.
  * Hỗ trợ chức năng "Ghi nhớ tài khoản" (Remember Me) lưu email vào LocalStorage.
  * Định hướng tích hợp đăng nhập qua bên thứ ba (Google OAuth, Apple ID).
* **Đăng ký (Register):**
  * Đăng ký tài khoản khách hàng mới với các thông tin: Họ tên, Email, Số điện thoại, Mật khẩu.
  * Kiểm tra độ mạnh mật khẩu (Password Strength) tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
* **Khôi phục mật khẩu (Forgot & Reset Password):**
  * Cho phép người dùng gửi yêu cầu cấp mã khôi phục qua Email khi quên mật khẩu.
  * Cho phép đặt lại mật khẩu mới thông qua Token bảo mật gửi kèm link reset.
* **Quản lý thông tin cá nhân:**
  * Xem thông tin cá nhân và cập nhật thông tin (Họ tên, SĐT).
  * Xem điểm tích lũy thành viên.

### **B. Phân hệ Quản lý Phim & Lịch chiếu (Movies & Showtimes Management - Dự kiến)**
* **Quản lý danh sách phim:**
  * Hiển thị phim đang chiếu và phim sắp chiếu.
  * Xem thông tin chi tiết phim: Trailer, Poster, Thể loại, Đạo diễn, Diễn viên, Thời lượng, Giới hạn độ tuổi và Mô tả phim.
* **Quản lý Lịch chiếu:**
  * Lọc suất chiếu theo ngày chiếu, theo định dạng phòng chiếu (2D, 3D, IMAX).
  * Lọc suất chiếu theo phim được chọn.

### **C. Phân hệ Đặt vé & Chọn ghế (Booking & Seat Selection - Dự kiến)**
* **Sơ đồ phòng chiếu tương tác:**
  * Hiển thị danh sách ghế trống, ghế đã có người đặt, ghế đang chọn, ghế VIP và ghế Thường dưới dạng sơ đồ trực quan.
  * Hỗ trợ khóa ghế tạm thời (Hold Seat) trong khoảng 5-10 phút để tránh tình trạng trùng lặp khi nhiều người đặt cùng lúc.
* **Tích điểm & Khuyến mãi:**
  * Tích điểm thành viên tự động sau khi thanh toán thành công (Sử dụng trường `score` của User).
  * Áp dụng mã giảm giá (Voucher) khi thanh toán.

### **D. Phân hệ Thanh toán (Payment System - Dự kiến)**
* **Tích hợp cổng thanh toán:**
  * Hỗ trợ thanh toán điện tử qua Ví điện tử (MOMO, VNPAY) hoặc Thẻ nội địa/quốc tế.
  * Xử lý callback trạng thái thanh toán từ bên thứ ba để xác nhận vé lập tức.

---

## 🔒 3. Yêu cầu Phi Chức năng (Non-functional Requirements)

### **A. Bảo mật (Security)**
* **Xác thực:** Sử dụng cơ chế stateless JWT (JSON Web Token) để duy trì phiên làm việc.
* **Lưu trữ:** Mật khẩu của người dùng bắt buộc phải được mã hóa một chiều bằng thuật toán mạnh (ví dụ: `BCryptPasswordEncoder` trong Spring Security) trước khi lưu vào PostgreSQL.
* **Giao tiếp:** Toàn bộ kênh truyền dẫn thông tin giữa Client và Server phải sử dụng giao thức bảo mật HTTPS/TLS.
* **Phân quyền APIs:** Áp dụng phân quyền chặt chẽ cấp Method/Endpoint trên Spring Security (`@PreAuthorize` hoặc `securityMatchers`).

### **B. Hiệu năng & Khả năng mở rộng (Performance & Scalability)**
* **Thời gian phản hồi (Response Time):** Các API thông thường như tải danh sách phim, thông tin suất chiếu phải trả về kết quả trong dưới 500ms.
* **Tốc độ tải trang (Vấn đề FE):**
  * First Contentful Paint (FCP) < 1.5 giây.
  * Largest Contentful Paint (LCP) < 2.5 giây.
  * Áp dụng kỹ thuật Lazy Loading và Code Splitting đối với các Route lớn để tối ưu dung lượng tải lần đầu.
* **Tương thích cơ sở dữ liệu:** Hỗ trợ cơ chế khóa dữ liệu (Optimistic Locking hoặc Pessimistic Locking) đối với thao tác chọn ghế của suất chiếu để ngăn hiện tượng Race Condition (hai người đặt trùng một ghế cùng một giây).

### **C. Trải nghiệm người dùng (UX/UI & Accessibility)**
* **Responsive:** Website phải tối ưu hóa giao diện hiển thị trên 3 lớp thiết bị chính: Điện thoại di động (width >= 375px), Máy tính bảng (width >= 768px), và Máy tính để bàn (width >= 1200px).
* **Đồng bộ hiệu ứng:** Sử dụng Framer Motion để tạo các hoạt cảnh mở trang (Page transition), hiệu ứng hover thẻ, và hiệu ứng tải (Skeleton Loading) mượt mà ở mức 60 FPS.
* **Khả năng tiếp cận:** Áp dụng đầy đủ thẻ HTML5 ngữ nghĩa, thuộc tính ARIA cho các thành phần điều hướng phức tạp, hỗ trợ di chuyển biểu mẫu bằng phím Tab.


--- ( Bổ sung bên dưới )

## ⚖️ 4. Các Quy tắc Nghiệp vụ Đặc thù & Ràng buộc Hệ thống (Business Rules & Edge Cases)

Để đảm bảo tính chính xác về mặt logic phần mềm và ngăn chặn các lỗi tranh chấp dữ liệu, hệ thống bắt buộc phải thực thi các quy tắc ràng buộc sau:

### **A. Cơ chế Giữ ghế Tạm thời (Seat Locking Rules)**
* **Kích hoạt khóa:** Ngay khi khách hàng nhấn chọn ghế trên màn hình Frontend và bấm "Tiến hành thanh toán", hệ thống sẽ gửi yêu cầu khóa ghế. Trạng thái của các ghế tương ứng trong bảng dữ liệu suất chiếu sẽ chuyển từ `AVAILABLE` sang `LOCKED`.
* **Thời gian giới hạn (TTL):** Thời gian giữ ghế tối đa là **5 phút** (hiển thị đếm ngược trên giao diện Client). Trong thời gian này, không một người dùng nào khác có thể chọn hoặc thao tác trên các ghế đã bị khóa.
* **Giải phóng ghế (Unlock):**
  * *Trường hợp thất bại:* Nếu quá 5 phút đếm ngược mà hệ thống chưa nhận được tín hiệu xác nhận thanh toán thành công từ cổng thanh toán bên thứ ba, một Background Job (Spring Task Scheduler) sẽ tự động giải phóng các ghế đó (`STATUS = AVAILABLE`) và hủy đơn hàng tạm thời.
  * *Trường hợp chủ động hủy:* Nếu người dùng nhấn nút "Quay lại" hoặc chủ động hủy giao dịch, hệ thống sẽ thực hiện giải phóng ghế ngay lập tức.

### **B. Quy tắc Đổi điểm thưởng & Tích lũy (Loyalty & Promotion Rules)**
* **Tỷ lệ tích điểm:** Mỗi giao dịch đặt vé thành công sẽ được trích một tỷ lệ phần trăm cố định dựa trên tổng tiền hóa đơn thực tế để chuyển thành điểm thưởng (Score) lưu vào hồ sơ user.
* **Tỷ lệ quy đổi điểm:** Điểm thưởng có thể dùng để khấu trừ trực tiếp vào giá trị hóa đơn tiếp theo (Ví dụ cấu hình mặc định: 1 điểm = 1.000 VNĐ).
* **Ràng buộc hệ thống (Constraints):**
  * Không cho phép số dư điểm thưởng bị âm (`score >= 0`).
  * Điểm thưởng chỉ được khấu trừ tối đa bằng giá trị tiền mặt của vé xem phim (không áp dụng khấu trừ âm hoặc trả lại tiền mặt thừa cho khách hàng).
  * Trong trường hợp đơn hàng bị hủy/hoàn, số điểm đã tiêu thụ phải được hoàn lại và số điểm dự kiến tích lũy của đơn đó phải bị khấu trừ.

### **C. Quy định Hủy vé và Hoàn tiền (Cancellation & Refund Rules)**
* **Điều kiện hủy vé:** Khách hàng chỉ có quyền tự hủy vé trực tuyến hoặc yêu cầu nhân viên quầy hỗ trợ hủy vé trước giờ phim chiếu tối thiểu **60 phút**. Các vé thuộc suất chiếu đã diễn ra hoặc sắp diễn ra trong vòng 60 phút sẽ không thể hoàn hủy dưới mọi hình thức.
* **Quy trình hoàn tiền:** Khi lệnh hủy được chấp nhận, hệ thống phải thực hiện đồng bộ một chuỗi hành động: Chuyển trạng thái hóa đơn thành `REFUNDED`, giải phóng các ghế đã đặt về trạng thái trống, thu hồi điểm thưởng đã cộng của đơn đó và tạo bản ghi lịch sử hoàn tiền trong dịch vụ thanh toán để đối soát.