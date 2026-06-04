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
import { loginSchema, LoginFormData } from '../utils/validation';
import { useAuthContext } from '../hooks/useAuthContext';

export const LoginPage: React.FC = () => {
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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('rememberEmail') || '',
      rememberMe: !!localStorage.getItem('rememberEmail'),
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      const from = (location.state as any)?.from?.pathname;

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Redirect theo role sau khi đăng nhập thành công
      const storedUser = tokenService.getUser();
      const roles: string[] = storedUser?.roles || [];

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AuthInput
            {...register('email')}
            label="Email"
            placeholder="name@example.com"
            type="email"
            icon={<Mail size={20} />}
            error={errors.email}
          />

          <div className="space-y-2">
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

          <div className="flex items-center justify-between">
            <motion.label
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 bg-white/10 border border-white/20 rounded cursor-pointer accent-red-600"
              />
              <span className="text-sm text-gray-300">Remember Me</span>
            </motion.label>

            <Link
              to="/auth/forgot-password"
              className="text-sm text-red-500 hover:text-red-400 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
          </div>

          <SocialLoginButtons
            onGoogleLogin={handleGoogleLogin}
            loading={isLoading}
          />

          <div className="text-center pt-2">
            <span className="text-gray-400">Don't have an account? </span>
            <Link
              to="/auth/register"
              className="text-red-500 hover:text-red-400 font-semibold transition-colors"
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
