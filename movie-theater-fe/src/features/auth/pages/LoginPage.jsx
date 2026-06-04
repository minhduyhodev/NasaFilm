import React, { useState } from 'react';
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
import './LoginPage.css';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('rememberEmail') || '',
      rememberMe: !!localStorage.getItem('rememberEmail'),
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      const from = (location.state)?.from?.pathname;

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Redirect theo role sau khi đăng nhập thành công
      const storedUser = tokenService.getUser();
      const roles = storedUser?.roles || [];

      const isAdminOrStaff = roles.some(
        (r) => r === 'admin' || r === 'staff'
      );

      if (isAdminOrStaff) {
        navigate('/admin', { replace: true });
      } else {
        // CUSTOMER (role 'user') → về trang chủ
        navigate('/', { replace: true });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
      setError('email', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('Google login clicked');
  };

  return (
    <AuthLayout
      showHero={true}
      heroTitle="NASAFILM"
      heroDescription="The most immersive cinema experience ever crafted for the digital age."
    >
      <AuthCard title="Welcome Back" subtitle="Sign in to your premier account">
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <AuthInput
            {...register('email')}
            label="Email"
            placeholder="name@example.com"
            type="email"
            icon={<Mail size={20} />}
            error={errors.email}
          />

          <div className="auth-field-wrapper">
            <AuthInput
              {...register('password')}
              label="Password"
              placeholder="••••••••"
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
                <div className="auth-spinner-icon"></div>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>

          <div className="auth-divider-wrapper">
            <div className="auth-divider-line"></div>
          </div>

          <SocialLoginButtons
            onGoogleLogin={handleGoogleLogin}
            loading={isLoading}
          />

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
