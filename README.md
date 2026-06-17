# 🎬 NasaFilm

NasaFilm là dự án hệ thống đặt vé xem phim, gồm frontend React/Vite và backend Spring Boot chạy tách biệt. Repo này hiện tập trung vào nền tảng xác thực người dùng, giao diện public/admin và phần khởi tạo hạ tầng cho các nghiệp vụ rạp phim.

## 🌌 Tổng quan

- `movie-theater-be`: backend Spring Boot, JWT, Spring Security, PostgreSQL
- `movie-theater-fe`: frontend React/Vite cho public pages, auth flow và admin pages
- `docs/`: tài liệu tổng quan, yêu cầu, thiết kế database, thiết kế API và tiến độ

Hiện tại dự án đã có luồng auth tương đối đầy đủ ở mức nền tảng, nhưng các nghiệp vụ lõi như booking, payment, showtime thực tế vẫn chưa hoàn thiện end-to-end.

## ✨ Tính năng hiện có

### ☕ Backend

- Đăng nhập bằng email/password
- Đăng nhập bằng Google
- Refresh token
- Logout
- Đăng ký tài khoản
- Xác thực đăng ký qua mã gửi email
- Seed sẵn role `ADMIN`, `STAFF`, `CUSTOMER`, `GUEST`
- Seed sẵn tài khoản admin, staff, customer qua biến môi trường
- Swagger UI để kiểm tra API

### ⚛️ Frontend

- Trang public: home, movies, cinemas, offers, about
- Trang auth: login, register, forgot-password, reset-password
- Verify đăng ký sau bước register
- Profile page cho người dùng đã đăng nhập
- Admin pages: dashboard, movies, showtimes, cinemas, users
- Bảo vệ route theo trạng thái đăng nhập và role
- Tự gắn bearer token và tự refresh token qua axios interceptor

## ⚠️ Giới hạn hiện tại

- Frontend đã có giao diện `forgot-password` và `reset-password`, nhưng backend hiện chưa có API tương ứng.
- Một số màn hình frontend đang dùng dữ liệu trình bày hoặc mock data.
- Nghiệp vụ đặt vé, suất chiếu, thanh toán và quản trị rạp vẫn chưa hoàn thiện đầy đủ ở backend.

## 🗂️ Cấu trúc repo

```text
NasaFilm/
|-- README.md
|-- docs/
|   |-- 00_PROJECT_OVERVIEW.md
|   |-- 01_REQUIREMENTS.md
|   |-- 02_DATABASE_DESIGN.md
|   |-- 03_API_DESIGN.md
|   `-- 04_PROGRESS.md
|-- movie-theater-be/
|   |-- .env.example
|   |-- docker-compose.yml
|   |-- mvnw.cmd
|   |-- pom.xml
|   `-- src/
`-- movie-theater-fe/
    |-- .env.example
    |-- package.json
    |-- vite.config.js
    `-- src/
```

## 🛠️ Công nghệ sử dụng

### ☕ Backend

- Java 21
- Spring Boot 3.5.14
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL
- JJWT 0.12.6
- Spring Mail
- OpenAPI / Swagger UI

### ⚛️ Frontend

- React 19
- Vite 8
- React Router DOM 6
- Axios
- React Hook Form
- Zod
- Framer Motion
- Tailwind CSS

## 📋 Yêu cầu môi trường

- Java 21
- Node.js 20+ và npm
- PostgreSQL
- Docker Desktop nếu muốn chạy database bằng `docker compose`

## 🚀 Cài đặt và chạy dự án

### 1. ▶️ Chạy backend

```powershell
cd movie-theater-be
Copy-Item .env.example .env
docker compose up -d
.\mvnw.cmd spring-boot:run
```

Backend mặc định chạy tại:

- `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

### 2. 🎨 Chạy frontend

```powershell
cd movie-theater-fe
npm install
npm run dev
```

Frontend mặc định chạy tại:

- `http://localhost:5173`

## 🔐 Biến môi trường quan trọng

### ☕ Backend

Tạo file `.env` trong `movie-theater-be` dựa trên `.env.example`.

Ví dụ:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movie_theater
DB_USERNAME=postgres
DB_PASSWORD=sa123

APP_JWT_SECRET=your_base64_encoded_jwt_secret
APP_JWT_ACCESS_EXPIRATION=900000
APP_JWT_REFRESH_EXPIRATION=604800000

GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
```

Ngoài ra backend còn dùng các nhóm biến:

- `APP_SEED_ADMIN_*`
- `APP_SEED_STAFF_*`
- `APP_SEED_CUSTOMER_*`
- `MAIL_*`

### ⚛️ Frontend

Tạo file `.env` trong `movie-theater-fe` nếu cần:

```env
VITE_API_URL=http://localhost:8080
VITE_ENABLE_GOOGLE_LOGIN=true
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

## ✅ Kiểm tra nhanh

1. Chạy backend và mở Swagger UI.
2. Gọi `POST /api/auth/login` bằng tài khoản seed sẵn.
3. Chạy frontend và đăng nhập bằng tài khoản backend.
4. Nếu dùng Google login, bảo đảm backend và frontend dùng cùng một Google Web Client ID.

## 📚 Tài liệu liên quan

- [00_PROJECT_OVERVIEW.md](/F:/NasaFilm/docs/00_PROJECT_OVERVIEW.md)
- [01_REQUIREMENTS.md](/F:/NasaFilm/docs/01_REQUIREMENTS.md)
- [02_DATABASE_DESIGN.md](/F:/NasaFilm/docs/02_DATABASE_DESIGN.md)
- [03_API_DESIGN.md](/F:/NasaFilm/docs/03_API_DESIGN.md)
- [04_PROGRESS.md](/F:/NasaFilm/docs/04_PROGRESS.md)

## 📝 Trung1 da sua Ghi chu nay

- Đây là repo nhiều subproject, cần chạy lệnh trong đúng thư mục con.
- README này chỉ đóng vai trò hướng dẫn vào dự án; phần chi tiết nên đặt trong thư mục `docs/`.
