import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import tokenService from '../utils/tokenService';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthCard } from '../components/AuthCard';
import { AuthInput } from '../components/AuthInput';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { loginSchema } from '../utils/validation';
import { useAuthContext } from '../hooks/useAuthContext';
import { notificationService } from '../../../shared/services/notificationService';
import './LoginPage.css';

export const LoginPage = () => {
  const googleButtonId = 'google-signin-button';
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const isExpired = sessionStorage.getItem('auth_expired');
    if (isExpired === 'true') {
      notificationService.warning('Phien dang nhap da het han. Vui long dang nhap lai.', {
        toastId: 'auth_expired_toast',
      });
      sessionStorage.removeItem('auth_expired');
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('rememberEmail') || '',
      rememberMe: !!localStorage.getItem('rememberEmail'),
    },
  });

  const redirectAfterLogin = () => {
    const from = location.state?.from?.pathname;
    const storedUser = tokenService.getUser();
    const roles = storedUser?.roles || [];

    if (from) {
      navigate(from, { replace: true });
      return;
    }

    const isAdminOrStaff = roles.some((r) => r === 'admin' || r === 'staff');
    navigate(isAdminOrStaff ? '/admin' : '/', { replace: true });
  };

  useEffect(() => {
    if (!googleClientId) {
      return undefined;
    }

    let cancelled = false;

    const initGoogle = () => {
      if (cancelled || !window.google?.accounts?.id) {
        return false;
      }

      const googleButtonElement = document.getElementById(googleButtonId);
      if (!googleButtonElement) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) {
            notificationService.error('Đăng nhập thất bại!');
            return;
          }

          setIsLoading(true);
          try {
            await loginWithGoogle({ idToken: response.credential });
            notificationService.success('Welcome to NASA FILM!');
            redirectAfterLogin();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Đăng nhập thất bại!';
            notificationService.error(errorMessage);
          } finally {
            setIsLoading(false);
          }
        },
      });

      googleButtonElement.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonElement, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: googleButtonElement.offsetWidth || 320,
      });

      return true;
    };

    if (initGoogle()) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(() => {
      if (initGoogle()) {
        window.clearInterval(intervalId);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [googleClientId, loginWithGoogle]);

  const handleQuickLogin = (email, password) => {
    setValue('email', email);
    setValue('password', password);
    handleSubmit(onSubmit)();
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      notificationService.success('Welcome to NASA FILM!');
      redirectAfterLogin();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Dang nhap that bai. Vui long thu lai.';

      notificationService.error(errorMessage);
      setError('email', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      notificationService.error('Thieu VITE_GOOGLE_CLIENT_ID tren frontend.');
      return;
    }

    if (!window.google?.accounts?.id) {
      notificationService.error('Google SDK chua san sang.');
      return;
    }

    const googleButtonElement = document.getElementById(googleButtonId);
    const googleButton = googleButtonElement?.querySelector('div[role="button"], iframe');

    if (googleButton instanceof HTMLElement) {
      googleButton.click();
      return;
    }

    notificationService.info('Nut Google chua san sang. Thu tai lai trang.');
  };

  return (
    <AuthLayout
      showHero={true}
      heroTitle="NASAFILM"
      heroDescription="The most immersive cinema experience ever crafted for the digital age. Mission-critical quality, delivered directly to your home observatory."
    >
      <AuthCard title="Welcome Back">
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <AuthInput
            {...register('email')}
            label="Email"
            placeholder="explorer@nasafilm.com"
            type="email"
            icon={<Mail size={20} />}
            error={errors.email}
          />

          <div className="auth-field-wrapper">
            <AuthInput
              {...register('password')}
              label="Password"
              placeholder="********"
              type="password"
              icon={<Lock size={20} />}
              error={errors.password}
              showPasswordToggle={true}
              showPassword={showPassword}
              onPasswordToggle={() => setShowPassword(!showPassword)}
            />
          </div>

          <div className="auth-form-actions">
            <motion.label
              whileHover={{ scale: 1.05 }}
              className="auth-remember-label"
            >
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="auth-checkbox"
              />
              <span className="auth-checkbox-label">Remember Me</span>
            </motion.label>

            <Link
              to="/auth/forgot-password"
              className="auth-forgot-link"
            >
              Forgot Password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="auth-submit-btn"
          >
            {isLoading ? (
              <span className="auth-loading-spinner">
                <div className="auth-spinner-icon" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>

          <div className="auth-quick-login-section">
            <span className="auth-quick-login-title">Quick Login (Dang nhap nhanh)</span>
            <div className="space-y-3 mt-2">
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() => navigate('/')}
                disabled={isLoading}
                className="auth-quick-btn customer"
              >
                Truy cập với tư cách khách
              </motion.button>

              <SocialLoginButtons
                onGoogleLogin={handleGoogleLogin}
                googleButtonId={googleButtonId}
                loading={isLoading}
                isPrioritized={true}
              />
            </div>
          </div>

          <div className="auth-footer">
            <span className="auth-footer-text">Don't have an account? </span>
            <Link
              to="/auth/register"
              className="auth-footer-link"
            >
              Create Account
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};

export default LoginPage;
