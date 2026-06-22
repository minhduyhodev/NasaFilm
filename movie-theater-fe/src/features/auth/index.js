// Components
export { AuthLayout } from './components/AuthLayout';
export { AuthCard } from './components/AuthCard';
export { AuthInput } from './components/AuthInput';
export { SocialLoginButtons } from './components/SocialLoginButtons';
export { PasswordStrength } from './components/PasswordStrength';
export { ProtectedRoute } from './components/ProtectedRoute';
export { PublicRoute } from './components/PublicRoute';

// Pages
export { default as LoginPage } from './pages/LoginPage';
export { default as RegisterPage } from './pages/RegisterPage';
export { default as ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { default as ResetPasswordPage } from './pages/ResetPasswordPage';
export { default as ActivateAccountPage } from './pages/ActivateAccountPage';
export { default as UnauthorizedPage } from './pages/UnauthorizedPage';



// Hooks
export { useAuth } from './hooks/useAuth';
export { useAuthContext } from './hooks/useAuthContext';
export { useLocalStorage } from './hooks/useLocalStorage';

// Services
export { authService } from './api/authService';

// Utilities
export { tokenService } from './utils/tokenService';
export * from './utils/validation';

// Context
export { AuthContext, AuthProvider } from './store/AuthContext';

// Routes
export { AuthRoutes } from './routes';
