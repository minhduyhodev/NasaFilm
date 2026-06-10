# Component & Hook Usage Guide

## 🔐 Authentication Hooks

### useAuthContext

Access global authentication state from anywhere in your app.

```tsx
import { useAuthContext } from "@/features/auth";

function MyComponent() {
  const {
    user, // User object or null
    isAuthenticated, // Boolean
    loading, // Loading state
    error, // Error message or null
    login, // Login function
    register, // Register function
    logout, // Logout function
    resetError, // Clear error state
  } = useAuthContext();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return <div>Welcome, {user?.fullName}!</div>;
}
```

### useAuth

Standalone authentication hook (not context-based).

```tsx
import { useAuth } from '@/features/auth';

function LoginComponent() {
  const { user, loading, error, login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ email, password });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    // Your login form here
  );
}
```

### useLocalStorage

Persist state to localStorage.

```tsx
import { useLocalStorage } from "@/features/auth";

function MyComponent() {
  const [value, setValue, removeValue] = useLocalStorage("key", "default");

  return (
    <>
      <p>Value: {value}</p>
      <button onClick={() => setValue("new value")}>Update</button>
      <button onClick={removeValue}>Clear</button>
    </>
  );
}
```

---

## 🎨 UI Components

### AuthLayout

Responsive container with optional hero section.

```tsx
import { AuthLayout } from "@/features/auth";

<AuthLayout
  showHero={true} // Optional hero section
  heroTitle="THDPV CINEMA" // Custom title
  heroDescription="Your description" // Custom description
>
  {/* Your content here */}
</AuthLayout>;
```

### AuthCard

Glassmorphism card wrapper.

```tsx
import { AuthCard } from "@/features/auth";

<AuthCard title="Sign In" subtitle="Welcome back">
  {/* Form content here */}
</AuthCard>;
```

### AuthInput

Enhanced input with icons and validation.

```tsx
import { AuthInput } from "@/features/auth";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";

function MyForm() {
  const {
    register,
    formState: { errors },
  } = useForm();

  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthInput
      {...register("email")}
      label="Email"
      placeholder="user@example.com"
      type="email"
      icon={<Mail size={20} />}
      error={errors.email}
    />
  );
}
```

### PasswordStrength

Real-time password strength indicator.

```tsx
import { PasswordStrength } from "@/features/auth";

function RegistrationForm() {
  const [password, setPassword] = useState("");

  return (
    <div>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
      />
      <PasswordStrength
        password={password}
        showRequirements={true} // Show checklist
      />
    </div>
  );
}
```

### SocialLoginButtons

Google and Apple OAuth buttons.

```tsx
import { SocialLoginButtons } from "@/features/auth";

<SocialLoginButtons
  onGoogleLogin={handleGoogleLogin}
  onAppleLogin={handleAppleLogin}
  loading={isLoading}
/>;
```

---

## 🛡️ Route Protection

### ProtectedRoute

Redirect unauthenticated users to login.

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

### PublicRoute

Redirect authenticated users away from auth pages.

```tsx
import { PublicRoute } from "@/features/auth";

<Route
  path="/login"
  element={
    <PublicRoute>
      <LoginPage />
    </PublicRoute>
  }
/>;
```

---

## 🔌 API Service

### authService

Complete authentication API wrapper.

```tsx
import { authService } from "@/features/auth";

// Login
const response = await authService.login({
  email: "user@example.com",
  password: "password",
  rememberMe: true,
});
// Response: { user, token, refreshToken }

// Register
const response = await authService.register({
  fullName: "John Doe",
  email: "user@example.com",
  phoneNumber: "+1234567890",
  password: "Password123!",
  confirmPassword: "Password123!",
  agreeToTerms: true,
});

// Forgot Password
await authService.forgotPassword({
  email: "user@example.com",
});

// Reset Password
await authService.resetPassword({
  token: "reset-token-from-email",
  password: "NewPassword123!",
  confirmPassword: "NewPassword123!",
});

// Social Login
const response = await authService.loginWithGoogle(googleToken);
const response = await authService.loginWithApple(appleToken);

// Token Refresh
const newToken = await authService.refreshToken();

// Logout
authService.logout();
```

---

## 📋 Form Validation Schemas

### Login Schema

```tsx
import { loginSchema, LoginFormData } from "@/features/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

### Register Schema

```tsx
import { registerSchema, RegisterFormData } from "@/features/auth";

const { register, handleSubmit } = useForm<RegisterFormData>({
  resolver: zodResolver(registerSchema),
});
```

### Forgot Password Schema

```tsx
import { forgotPasswordSchema } from "@/features/auth";

const { register, handleSubmit } = useForm({
  resolver: zodResolver(forgotPasswordSchema),
});
```

### Reset Password Schema

```tsx
import { resetPasswordSchema } from "@/features/auth";

const { register, handleSubmit } = useForm({
  resolver: zodResolver(resetPasswordSchema),
});
```

---

## 🔔 Notifications

### Notification Service

Display toast notifications.

```tsx
import { notificationService } from "@/shared/services/notificationService";

// Success
notificationService.success("Login successful!");

// Error
notificationService.error("Login failed. Please try again.");

// Warning
notificationService.warning("Your session will expire soon.");

// Info
notificationService.info("New feature available!");

// Loading
const toastId = notificationService.loading("Processing...");

// Update Loading Toast
notificationService.update(toastId, {
  render: "Done!",
  type: "success",
  isLoading: false,
  autoClose: 3000,
});

// Dismiss
notificationService.dismiss(toastId);
```

---

## 🔑 Token Management

### tokenService

Manage JWT tokens.

```tsx
import { tokenService } from "@/features/auth";

// Get token
const token = tokenService.getToken();

// Set token
tokenService.setToken("new-token");

// Get refresh token
const refreshToken = tokenService.getRefreshToken();

// Set refresh token
tokenService.setRefreshToken("new-refresh-token");

// Get user
const user = tokenService.getUser();

// Set user
tokenService.setUser(userData);

// Check if token expired
const isExpired = tokenService.isTokenExpired(token);

// Get expiration time
const expTime = tokenService.getTokenExpiration(token);

// Clear all auth data
tokenService.clear();
```

---

## 📊 Types

### User Type

```tsx
interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: "user" | "admin" | "staff";
  createdAt: string;
}
```

### Auth Context Type

```tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  resetError: () => void;
}
```

### Login Credentials

```tsx
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

### Register Credentials

```tsx
interface RegisterCredentials {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}
```

---

## 🛠️ Utilities

### Logger

Debug logging utility.

```tsx
import { logger } from "@/shared/utils/logger";

logger.debug("Debug message", { data: "optional" });
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message", error);
```

### Helpers

Utility functions.

```tsx
import {
  sleep,
  debounce,
  throttle,
  formatError,
  validateEmail,
  validatePhoneNumber,
} from "@/shared/utils/helpers";

// Async delay
await sleep(1000);

// Debounce function
const debouncedSearch = debounce((query) => {
  // Search API call
}, 300);

// Throttle function
const throttledScroll = throttle(() => {
  // Handle scroll
}, 100);

// Format error
const message = formatError(error);

// Validate email
if (validateEmail("user@example.com")) {
  // Valid email
}

// Validate phone
if (validatePhoneNumber("+1234567890")) {
  // Valid phone
}
```

---

## 🎨 Styling

### Tailwind Utilities

Use built-in utility classes.

```tsx
// Primary button
<button className="btn-primary">Button</button>

// Secondary button
<button className="btn-secondary">Button</button>

// Glass effect
<div className="glass-effect">Content</div>

// Auth input
<input className="input-auth" />

// Loading spinner
<div className="spinner"></div>
```

---

## 🔄 Complete Flow Example

```tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthCard,
  AuthInput,
  SocialLoginButtons,
  loginSchema,
  LoginFormData,
  authService,
} from "@/features/auth";
import { notificationService } from "@/shared/services/notificationService";
import { Mail, Lock } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await authService.login(data);
      notificationService.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      notificationService.error(message);
      setError("email", { message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showHero={true}>
      <AuthCard title="Sign In" subtitle="Welcome back">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AuthInput
            {...register("email")}
            label="Email"
            placeholder="user@example.com"
            type="email"
            icon={<Mail size={20} />}
            error={errors.email}
          />

          <AuthInput
            {...register("password")}
            label="Password"
            placeholder="••••••••"
            type="password"
            icon={<Lock size={20} />}
            error={errors.password}
            showPasswordToggle={true}
            showPassword={showPassword}
            onPasswordToggle={() => setShowPassword(!showPassword)}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          <SocialLoginButtons
            onGoogleLogin={() => {}}
            onAppleLogin={() => {}}
            loading={isLoading}
          />
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
```

---

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [Framer Motion Documentation](https://www.framer.com/motion)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)
- [Lucide Icons](https://lucide.dev)

---

**Version**: 1.0.0  
**Last Updated**: May 2024  
**Status**: Complete & Production Ready ✅
