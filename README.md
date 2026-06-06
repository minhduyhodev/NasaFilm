# NasaFilm

NasaFilm là hệ thống đặt vé xem phim, gồm 2 subproject chạy độc lập:

- `movie-theater-be`: backend Spring Boot, xử lý xác thực, người dùng, JWT và PostgreSQL.
- `movie-theater-fe`: frontend React/Vite, xử lý giao diện public, auth và admin.

## Tổng quan hiện trạng

- Backend hiện tập trung vào auth và user foundation.
- Frontend đã có giao diện cho public pages, auth flow và admin layout.
- Các nghiệp vụ cinema đầy đủ như booking thật, payment thật, showtime thật vẫn chưa hoàn thiện end-to-end trong backend.

## Cấu trúc repo

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

## Tech stack

### Backend

- Java 21
- Spring Boot 3.5.14
- Spring Web, Spring Security, Spring Data JPA, Validation, Mail
- PostgreSQL
- JWT với `jjwt` 0.12.6
- OpenAPI / Swagger UI
- Maven Wrapper

### Frontend

- React 19
- Vite 8
- React Router DOM 6
- Axios
- React Hook Form + Zod
- Framer Motion
- Tailwind CSS và CSS riêng theo từng màn hình

## Những gì đang có trong mã nguồn

### Backend

- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/register`
- `POST /api/auth/register/verify`
- Seed sẵn role `ADMIN`, `STAFF`, `CUSTOMER`
- Seed sẵn tài khoản admin, staff, customer qua biến môi trường
- Response wrapper chung qua `ApiResponse`
- Swagger UI để test API

### Frontend

- Public pages: home, movies, cinemas, offers, about
- Auth pages: login, register, forgot-password, reset-password
- Verify đăng ký sau bước register
- Lưu access token, refresh token và tự refresh qua interceptor
- Profile page cho user đã đăng nhập
- Admin area: dashboard, movies, showtimes, cinemas, users
- Protected route theo trạng thái đăng nhập và role

## Giới hạn hiện tại

- Frontend có giao diện `forgot-password` và `reset-password`, nhưng backend hiện chưa có API tương ứng.
- Nhiều màn hình frontend đang là UI hoặc mock data, chưa gắn đầy đủ với dữ liệu backend thật.
- Tài liệu trong `docs/` có mô tả roadmap dài hạn, nên một số phần sẽ vượt quá phạm vi code hiện tại.

## Yêu cầu môi trường

- Java 21
- Node.js 20+ và npm
- PostgreSQL
- Docker Desktop nếu muốn chạy PostgreSQL bằng `docker compose`

## Chạy backend

Từ thư mục `movie-theater-be`:

```powershell
cd movie-theater-be
Copy-Item .env.example .env
docker compose up -d
.\mvnw.cmd spring-boot:run
```

Các biến quan trọng trong `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=name_movie_theater
DB_USERNAME=nameDB
DB_PASSWORD=passDB

APP_JWT_SECRET=your_base64_encoded_jwt_secret
APP_JWT_ACCESS_EXPIRATION=900000
APP_JWT_REFRESH_EXPIRATION=604800000

GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
```

Ngoài ra backend còn dùng:

- `APP_SEED_ADMIN_*`
- `APP_SEED_STAFF_*`
- `APP_SEED_CUSTOMER_*`
- `MAIL_*`

Backend mặc định chạy tại:

- `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

## Chạy frontend

Từ thư mục `movie-theater-fe`:

```powershell
cd movie-theater-fe
npm install
npm run dev
```

Tạo `.env` nếu cần, dựa trên `.env.example`:

```env
VITE_API_URL=http://localhost:8080
VITE_ENABLE_GOOGLE_LOGIN=true
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

Frontend mặc định chạy tại `http://localhost:5173`.

## Kiểm tra nhanh

1. Chạy backend và mở Swagger UI.
2. Dùng tài khoản seed để gọi `POST /api/auth/login`.
3. Chạy frontend và đăng nhập bằng tài khoản seed.
4. Nếu dùng Google login, bảo đảm `GOOGLE_WEB_CLIENT_ID` ở backend và `VITE_GOOGLE_CLIENT_ID` ở frontend dùng cùng một Web Client.

## Tài liệu liên quan

- `docs/00_PROJECT_OVERVIEW.md`: tổng quan và định hướng dự án
- `docs/01_REQUIREMENTS.md`: yêu cầu nghiệp vụ
- `docs/02_DATABASE_DESIGN.md`: thiết kế dữ liệu
- `docs/03_API_DESIGN.md`: thiết kế API
- `docs/04_PROGRESS.md`: tiến độ và roadmap
