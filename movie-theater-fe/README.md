# movie-theater-fe

Frontend của NasaFilm được xây bằng React và Vite. Project này chịu trách nhiệm cho giao diện public, luồng xác thực người dùng và khu vực admin.

## Tech stack

- React 19
- Vite 8
- React Router DOM 6
- Axios
- React Hook Form + Zod
- Framer Motion
- Tailwind CSS

## Những gì đang có

- Public pages: home, movies, cinemas, offers, about
- Auth pages: login, register, forgot-password, reset-password
- Verify đăng ký sau khi register
- Lưu `accessToken`, `refreshToken`, thông tin user ở client
- Axios interceptor tự gắn bearer token và tự gọi refresh token khi cần
- Profile page
- Admin pages: dashboard, movies, showtimes, cinemas, users
- Route protection cho user thường và admin/staff

## Những gì chưa hoàn chỉnh

- `forgot-password` và `reset-password` mới có giao diện; backend hiện chưa có API tương ứng.
- Nhiều màn hình home/admin đang dùng dữ liệu trình bày hoặc mock data.
- Chức năng Google login phụ thuộc vào cả biến môi trường frontend lẫn backend.

## Cấu hình môi trường

Tạo file `.env` từ `.env.example` nếu cần:

```env
VITE_API_URL=http://localhost:8080
VITE_ENV=development
VITE_ENABLE_GOOGLE_LOGIN=true
VITE_ENABLE_APPLE_LOGIN=false
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

## Chạy project

```powershell
npm install
npm run dev
```

Mặc định frontend chạy tại `http://localhost:5173`.

## Kết nối backend

Frontend hiện gọi các endpoint auth sau:

- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/register`
- `POST /api/auth/register/verify`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Nếu backend không chạy hoặc `VITE_API_URL` sai, các luồng auth sẽ lỗi.
