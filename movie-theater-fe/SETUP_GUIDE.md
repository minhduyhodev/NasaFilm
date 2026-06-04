# Authentication System Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
VITE_ENABLE_GOOGLE_LOGIN=true
VITE_ENABLE_APPLE_LOGIN=true
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the Application

- Login: http://localhost:5173/auth/login
- Register: http://localhost:5173/auth/register
- Home: http://localhost:5173

---

## Backend API Requirements

The frontend expects the following API endpoints on your backend:

### Authentication Endpoints

#### POST /api/auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatar": "https://...",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### POST /api/auth/register

Request:

```json
{
  "fullName": "John Doe",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123!"
}
```

Response:

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### POST /api/auth/forgot-password

Request:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "message": "Recovery code sent to your email"
}
```

#### POST /api/auth/reset-password

Request:

```json
{
  "token": "reset-token-from-email",
  "password": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

Response:

```json
{
  "message": "Password reset successfully"
}
```

#### POST /api/auth/refresh

Request:

```json
{
  "refreshToken": "eyJhbGc..."
}
```

Response:

```json
{
  "token": "eyJhbGc..."
}
```

#### POST /api/auth/google

Request:

```json
{
  "token": "google-oauth-token"
}
```

Response:

```json
{
  "user": { ... },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### POST /api/auth/apple

Request:

```json
{
  "token": "apple-oauth-token"
}
```

Response:

```json
{
  "user": { ... },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

## Error Handling

The API should return errors in this format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "status": 400,
  "details": {
    "field": "email",
    "message": "Email already exists"
  }
}
```

---

## Frontend Integration Points

### 1. Protect Routes

Wrap your dashboard/authenticated routes with `ProtectedRoute`:

```tsx
import { ProtectedRoute } from "@/features/auth";

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>;
```

### 2. Access Auth State

Use `useAuthContext` in any component:

```tsx
import { useAuthContext } from "@/features/auth";

function UserProfile() {
  const { user, logout } = useAuthContext();

  return (
    <div>
      <h1>{user?.fullName}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Show Notifications

Use the notification service:

```tsx
import { notificationService } from "@/shared/services/notificationService";

notificationService.success("Login successful!");
notificationService.error("Something went wrong");
```

### 4. Make API Calls

The auth service automatically adds JWT token to requests:

```tsx
// Token is automatically added
const response = await authService.login({
  email: "user@example.com",
  password: "password",
});
```

---

## Customization

### Change API Base URL

Update `.env`:

```env
VITE_API_URL=https://your-api-domain.com/api
```

### Customize Validation Rules

Edit `src/features/auth/utils/validation.ts`:

```tsx
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8), // Change minimum length
});
```

### Modify Theme Colors

Update `tailwind.config.js`:

```js
colors: {
  accent: {
    red: '#dc2626', // Change accent color
  },
}
```

### Add Custom Animations

Edit `tailwind.config.js` keyframes:

```js
keyframes: {
  customAnimation: {
    '0%': { /* ... */ },
    '100%': { /* ... */ },
  },
}
```

---

## Testing the Auth Flow

### 1. Test Login

1. Navigate to http://localhost:5173/auth/login
2. Enter test credentials
3. Should redirect to home page
4. Token should be stored in localStorage

### 2. Test Registration

1. Navigate to http://localhost:5173/auth/register
2. Fill in all fields
3. Password should pass strength check
4. Submit should call registration API
5. Should redirect to login with success message

### 3. Test Password Reset

1. Go to /auth/login
2. Click "Forgot Password"
3. Enter email
4. Should show success message
5. Check email for reset link
6. Click link and reset password
7. Should redirect to login

### 4. Test Protected Routes

1. Try accessing /dashboard without logging in
2. Should redirect to /auth/login
3. Log in and access /dashboard
4. Should show dashboard content

---

## Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker Deployment

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
```

---

## Troubleshooting

### CORS Error

- Ensure backend CORS configuration allows your frontend URL
- Add to backend: `Access-Control-Allow-Origin: http://localhost:5173`

### Token Not Being Sent

- Check if token is stored: `localStorage.getItem('authToken')`
- Verify Authorization header in Network tab
- Check if API expects different header format

### Login Redirects to Login Page

- Check if token is actually stored in localStorage
- Verify JWT is valid (use jwt.io to decode)
- Check if backend returns proper token format

### Form Not Validating

- Open browser console for Zod validation errors
- Ensure all required fields are filled
- Check validation.ts for field requirements

### Animations Choppy

- Disable animations in DevTools Performance tab to test
- Check browser GPU acceleration
- Reduce animation duration in tailwind.config.js

---

## Security Best Practices

✅ **Implemented**

- JWT token management
- Secure password hashing validation
- Error handling without exposing sensitive data
- Password strength requirements
- Input validation with Zod

**To Implement on Backend**

- Use httpOnly cookies instead of localStorage for tokens
- Implement CSRF protection
- Add rate limiting
- Validate all inputs on backend
- Use bcrypt for password hashing
- Implement account lockout after failed attempts
- Enable HTTPS/TLS
- Add request signing
- Implement audit logging

---

## Performance Tips

1. **Code Splitting**: Import components using React.lazy()
2. **Image Optimization**: Use next-gen formats (WebP)
3. **Bundle Analysis**: Run `npm run build -- --analyze`
4. **Minification**: Automatically done in production build
5. **Caching**: Implement HTTP caching headers on server
6. **CDN**: Deploy assets to CDN for faster delivery

---

## Support & Documentation

- Framer Motion: https://www.framer.com/motion/
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- TailwindCSS: https://tailwindcss.com/
- Lucide Icons: https://lucide.dev/

---

**Last Updated**: 2024
**Version**: 1.0.0
