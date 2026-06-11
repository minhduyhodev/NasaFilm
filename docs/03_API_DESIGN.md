# THIET KE RESTFUL APIs (API DESIGN) - THDPV Movie Theater

Tai lieu nay mo ta cac API endpoint hien tai cua he thong va de xuat contract cho cac module nghiep vu tiep theo. Noi dung duoi day uu tien bam sat backend convention hien co: public API duoi `/api/...`, admin API duoi `/api/admin/...`, va response wrapper dung `ApiResponse<T>`.

---

## 1. Authentication API

Base URL: `/api`

### 1.1. Dang nhap

- Endpoint: `POST /api/login`
- Mo ta: Dang nhap bang email va mat khau, tra ve access token va refresh token.
- Quyen truy cap: Public

Body request:

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

Response success:

```json
{
  "success": true,
  "code": 200,
  "message": "Thanh cong",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-value",
    "userId": "e4a2d592-3a5f-4a0b-9cf9-79860b29ff5e",
    "fullName": "System Administrator",
    "email": "admin@example.com",
    "roles": [
      "ADMIN"
    ],
    "tokenType": "Bearer"
  },
  "timestamp": "2026-06-11T09:00:00Z"
}
```

### 1.2. Gia han access token

- Endpoint: `POST /api/refresh`
- Mo ta: Cap moi access token khi refresh token van con hieu luc.
- Quyen truy cap: Public

Body request:

```json
{
  "refreshToken": "refresh-token-value"
}
```

### 1.3. Dang ky

- Endpoint: `POST /api/register`
- Mo ta: Tao moi tai khoan khach hang.
- Quyen truy cap: Public

Body request:

```json
{
  "fullName": "Nguyen Van A",
  "email": "nva@example.com",
  "phoneNumber": "0987654321",
  "password": "SecurePassword123!"
}
```

### 1.4. Quen mat khau

- Endpoint: `POST /api/forgot-password`
- Mo ta: Gui email chua reset token.
- Quyen truy cap: Public

### 1.5. Dat lai mat khau

- Endpoint: `POST /api/reset-password`
- Mo ta: Dat lai mat khau bang token nhan qua email.
- Quyen truy cap: Public

---

## 2. Proposed Core APIs

### 2.0. User Profile API

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `GET` | `/api/users/me` | User da dang nhap | Lay thong tin ho so ca nhan |
| `PUT` | `/api/users/me` | User da dang nhap | Cap nhat thong tin ca nhan |
| `GET` | `/api/admin/users` | Admin | Danh sach tai khoan nguoi dung |
| `GET` | `/api/admin/users/{id}` | Admin | Xem chi tiet tai khoan |
| `PUT` | `/api/admin/users/{id}/status` | Admin | Khoa/mo khoa tai khoan |
| `PUT` | `/api/admin/users/{id}/roles` | Admin | Cap nhat vai tro nguoi dung |

### 2.1. Movies API

Module phim duoc thiet ke theo huong `Movie` la aggregate root:
- `MOVIE` la du lieu chinh cua phim.
- `MOVIE_MEDIA` la danh sach poster, banner, trailer, gallery cua phim.
- `MOVIE_GENRE`, `MOVIE_COUNTRY`, `MOVIE_ACTOR` la cac quan he con cua phim.
- `GENRE`, `COUNTRY`, `ACTOR` la master data dung lai.

Base URL:
- Public: `/api/movies`
- Admin: `/api/admin/movies`

Movie status:
- `DRAFT`
- `COMING_SOON`
- `NOW_SHOWING`
- `ENDED`
- `HIDDEN`

Movie media type:
- `POSTER`
- `BANNER`
- `TRAILER`
- `GALLERY`
- `THUMBNAIL`

#### 2.1.1. Response wrapper

Tat ca API module phim nen bam chuan `ApiResponse<T>`:

```json
{
  "success": true,
  "code": 200,
  "message": "Thanh cong",
  "data": {},
  "timestamp": "2026-06-11T09:00:00Z"
}
```

Neu co phan trang, `data` nen co cau truc:

```json
{
  "items": [],
  "page": 0,
  "size": 10,
  "totalItems": 100,
  "totalPages": 10,
  "hasNext": true,
  "hasPrevious": false
}
```

#### 2.1.2. DTO tra ve

`MovieListItemResponse`

```json
{
  "uuid": "uuid",
  "title": "Interstellar",
  "description": "string",
  "durationMinutes": 169,
  "releaseDate": "2014-11-07",
  "status": "COMING_SOON",
  "primaryPosterUrl": "https://...",
  "genres": [
    { "uuid": "uuid", "name": "Sci-Fi" }
  ],
  "countries": [
    { "uuid": "uuid", "code": "US", "name": "United States" }
  ]
}
```

`MovieDetailResponse`

```json
{
  "uuid": "uuid",
  "title": "Interstellar",
  "description": "string",
  "durationMinutes": 169,
  "releaseDate": "2014-11-07",
  "status": "COMING_SOON",
  "createdAt": "2026-06-11T09:00:00Z",
  "updatedAt": "2026-06-11T09:00:00Z",
  "genres": [
    { "uuid": "uuid", "name": "Sci-Fi" }
  ],
  "countries": [
    { "uuid": "uuid", "code": "US", "name": "United States" }
  ],
  "actors": [
    {
      "actorUuid": "uuid",
      "fullName": "Matthew McConaughey",
      "avatarUrl": "https://...",
      "country": {
        "uuid": "uuid",
        "code": "US",
        "name": "United States"
      },
      "characterName": "Cooper",
      "castOrder": 1,
      "isMain": true
    }
  ],
  "media": [
    {
      "uuid": "uuid",
      "mediaUrl": "https://...",
      "mediaType": "POSTER",
      "title": "Official Poster",
      "isPrimary": true,
      "sortOrder": 1
    }
  ]
}
```

#### 2.1.3. Public Movies API

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `GET` | `/api/movies` | Public | Lay danh sach phim public co filter, paging, sort |
| `GET` | `/api/movies/{movieUuid}` | Public | Lay chi tiet phim kem genre, country, cast, media |
| `GET` | `/api/movies/{movieUuid}/media` | Public | Lay media cua phim |
| `GET` | `/api/movies/{movieUuid}/cast` | Public | Lay cast cua phim |

Query params cua `GET /api/movies`:
- `keyword`
- `status`
- `genreUuid`
- `countryUuid`
- `actorUuid`
- `releaseFrom`
- `releaseTo`
- `page` mac dinh `0`
- `size` mac dinh `10`
- `sortBy` mac dinh `releaseDate`
- `sortDir` mac dinh `desc`

Rule public:
- Chi tra ve phim co `status` thuoc `COMING_SOON`, `NOW_SHOWING`, `ENDED`.
- `GET /api/movies/{movieUuid}` tra `404` neu phim khong ton tai hoac khong con public.

#### 2.1.4. Admin Movies API

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `GET` | `/api/admin/movies` | Admin / Staff | Lay danh sach phim bao gom ca `DRAFT`, `HIDDEN` |
| `GET` | `/api/admin/movies/{movieUuid}` | Admin / Staff | Lay chi tiet phim cho CMS |
| `POST` | `/api/admin/movies` | Admin / Staff | Tao phim cung genre, country, actor, media |
| `PUT` | `/api/admin/movies/{movieUuid}` | Admin / Staff | Cap nhat toan bo aggregate phim |
| `PATCH` | `/api/admin/movies/{movieUuid}/status` | Admin / Staff | Cap nhat rieng trang thai phim |
| `DELETE` | `/api/admin/movies/{movieUuid}` | Admin | Xoa mem hoac an phim khoi public |

Query params cua `GET /api/admin/movies`:
- `keyword`
- `status`
- `genreUuid`
- `countryUuid`
- `actorUuid`
- `releaseFrom`
- `releaseTo`
- `createdFrom`
- `createdTo`
- `page`
- `size`
- `sortBy`
- `sortDir`

`POST /api/admin/movies` va `PUT /api/admin/movies/{movieUuid}` dung body aggregate:

```json
{
  "title": "Interstellar",
  "description": "string",
  "durationMinutes": 169,
  "releaseDate": "2014-11-07",
  "status": "DRAFT",
  "genreUuids": ["uuid1", "uuid2"],
  "countryUuids": ["uuid1"],
  "actors": [
    {
      "actorUuid": "uuid",
      "characterName": "Cooper",
      "castOrder": 1,
      "isMain": true
    }
  ],
  "media": [
    {
      "uuid": "optional-existing-uuid",
      "mediaUrl": "https://...",
      "mediaType": "POSTER",
      "title": "Official Poster",
      "isPrimary": true,
      "sortOrder": 1
    }
  ]
}
```

Validation chinh:
- `title`: bat buoc, khong rong.
- `durationMinutes`: phai `> 0`.
- `status`: bat buoc.
- `genreUuids`, `countryUuids`: khong chua phan tu trung.
- `actors.actorUuid`: bat buoc.
- `actors.castOrder`: phai `>= 1`.
- `media.mediaUrl`: bat buoc.
- `media.mediaType`: bat buoc.
- Moi phim nen chi co 1 poster chinh.

`PATCH /api/admin/movies/{movieUuid}/status`

```json
{
  "status": "NOW_SHOWING"
}
```

#### 2.1.5. Admin sub-resource APIs

Chi dung nhom API nay khi frontend CMS can luu tung tab rieng. Neu khong, uu tien submit full aggregate bang `POST/PUT /api/admin/movies`.

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `PUT` | `/api/admin/movies/{movieUuid}/genres` | Admin / Staff | Thay toan bo danh sach genre cua phim |
| `PUT` | `/api/admin/movies/{movieUuid}/countries` | Admin / Staff | Thay toan bo danh sach country cua phim |
| `PUT` | `/api/admin/movies/{movieUuid}/actors` | Admin / Staff | Thay toan bo danh sach actor/character cua phim |
| `PUT` | `/api/admin/movies/{movieUuid}/media` | Admin / Staff | Thay toan bo danh sach media cua phim |

#### 2.1.6. Master data APIs phuc vu module phim

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `GET` | `/api/genres` | Public | Lay danh muc the loai de filter |
| `GET` | `/api/countries` | Public | Lay danh muc quoc gia de filter |
| `GET` | `/api/actors` | Public | Lay danh sach dien vien co filter |
| `GET` | `/api/admin/genres` | Admin / Staff | Danh sach genre cho CMS |
| `POST` | `/api/admin/genres` | Admin / Staff | Tao genre |
| `PUT` | `/api/admin/genres/{genreUuid}` | Admin / Staff | Cap nhat genre |
| `DELETE` | `/api/admin/genres/{genreUuid}` | Admin | Xoa genre |
| `GET` | `/api/admin/countries` | Admin / Staff | Danh sach country cho CMS |
| `POST` | `/api/admin/countries` | Admin / Staff | Tao country |
| `PUT` | `/api/admin/countries/{countryUuid}` | Admin / Staff | Cap nhat country |
| `DELETE` | `/api/admin/countries/{countryUuid}` | Admin | Xoa country |
| `GET` | `/api/admin/actors` | Admin / Staff | Danh sach actor cho CMS |
| `POST` | `/api/admin/actors` | Admin / Staff | Tao actor |
| `PUT` | `/api/admin/actors/{actorUuid}` | Admin / Staff | Cap nhat actor |
| `DELETE` | `/api/admin/actors/{actorUuid}` | Admin | Xoa actor |

#### 2.1.7. Rule nghiep vu nen chot

- `movie_genres(movie_uuid, genre_uuid)` la unique.
- `movie_countries(movie_uuid, country_uuid)` la unique.
- `movie_actors` nen chan trung theo `movieUuid + actorUuid + characterName` tai service layer.
- Khong cho chuyen sang `NOW_SHOWING` neu chua co poster chinh.
- Khong cho xoa phim neu phim da co `showtime`.
- Public API khong tra ve phim `DRAFT` hoac `HIDDEN`.

### 2.2. Showtimes and Seats API

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `GET` | `/api/showtimes?date=2026-06-02` | Public | Lay lich chieu theo ngay cua toan rap |
| `GET` | `/api/showtimes?movie_id={id}` | Public | Lay lich chieu cua mot bo phim cu the |
| `GET` | `/api/showtimes/{id}/seats` | Public | Lay so do ghe va tinh trang ghe trong/da dat cua suat chieu |
| `POST` | `/api/showtimes` | Admin | Khoi tao suat chieu moi |

### 2.3. Bookings API

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `POST` | `/api/bookings` | Customer (JWT) | Chon ghe va tao hoa don tam |
| `GET` | `/api/bookings/{id}` | Customer so huu / Staff | Xem chi tiet thong tin ve va QR |
| `GET` | `/api/bookings/my-history` | Customer (JWT) | Xem lich su mua ve ca nhan |
| `PUT` | `/api/bookings/{id}/cancel` | Staff / Admin | Huy ve hoac doi tra theo yeu cau |

### 2.4. Payment API

| Method | Endpoint | Quyen truy cap | Mo ta |
|---|---|---|---|
| `POST` | `/api/payments/create-url` | Customer (JWT) | Tao lien ket thanh toan sang MOMO/VNPAY |
| `GET/POST` | `/api/payments/callback` | Public | Nhan callback tu cong thanh toan de cap nhat booking |

---

## 3. Error Handling Format

De client de bat loi va xu ly thong bao, server nen tra ve response loi thong nhat. Hien tai backend dang dung `ApiResponse<T>` nen loi nghiep vu module phim nen follow dang:

```json
{
  "success": false,
  "code": 404,
  "message": "Phim khong ton tai",
  "timestamp": "2026-06-11T09:00:00Z"
}
```

Mot so error code nen co them cho module phim:
- `MOVIE_NOT_FOUND`
- `GENRE_NOT_FOUND`
- `COUNTRY_NOT_FOUND`
- `ACTOR_NOT_FOUND`
- `MOVIE_STATUS_INVALID`
- `MOVIE_MEDIA_INVALID`
- `MOVIE_HAS_SHOWTIME`
- `MOVIE_DUPLICATE_GENRE`
- `MOVIE_DUPLICATE_COUNTRY`
- `MOVIE_DUPLICATE_ACTOR`
