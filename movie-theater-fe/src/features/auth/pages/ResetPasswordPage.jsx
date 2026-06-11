import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthCard } from '../components/AuthCard';
import { AuthInput } from '../components/AuthInput';
import { PasswordStrength } from '../components/PasswordStrength';
import { resetPasswordSchema } from '../utils/validation';
import { authService } from '../api/authService';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const resetToken = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    if (!resetToken) {
      setError('password', {
        message: 'Mã token đặt lại mật khẩu không hợp lệ hoặc thiếu',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        token: resetToken,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      setSuccessMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
      setError('password', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout showHero={false}>
        <AuthCard title="Mã Token Không Hợp Lệ" subtitle="Mã token đặt lại mật khẩu bị thiếu hoặc đã hết hạn">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-center text-gray-400">
              Đường liên kết đặt lại mật khẩu này không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một liên kết mới.
            </p>
            <Link
              to="/forgot-password"
              className="block w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 text-center"
            >
              Yêu cầu liên kết đặt lại mật khẩu mới
            </Link>
          </motion.div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showHero={false}>
      <AuthCard
        title="Đặt Lại Mật Khẩu"
        subtitle="Tạo mật khẩu mới cho tài khoản của bạn"
      >
        {successMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Success Icon */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30"
              >
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            </div>

            {/* Success Message */}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-green-500">
                Đặt lại mật khẩu thành công!
              </h3>
              <p className="text-gray-400">{successMessage}</p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New Password Input */}
            <AuthInput
              {...register('password')}
              label="Mật khẩu mới"
              placeholder="••••••••"
              type="password"
              icon={<Lock size={20} />}
              error={errors.password}
              showPasswordToggle={true}
              showPassword={showPassword}
              onPasswordToggle={() => setShowPassword(!showPassword)}
            />

            {/* Password Strength Indicator */}
            {password && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <PasswordStrength
                  password={password}
                  showRequirements={true}
                />
              </motion.div>
            )}

            {/* Confirm Password Input */}
            <AuthInput
              {...register('confirmPassword')}
              label="Xác nhận mật khẩu"
              placeholder="••••••••"
              type="password"
              icon={<Lock size={20} />}
              error={errors.confirmPassword}
              showPasswordToggle={true}
              showPassword={showConfirmPassword}
              onPasswordToggle={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-red-300">
                Mật khẩu của bạn phải dài ít nhất 8 ký tự và chứa chữ hoa, chữ thường, chữ số cùng ký tự đặc biệt.
              </p>
            </motion.div>

            {/* Reset Button */}
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
                  Đang đặt lại...
                </span>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </motion.button>

            {/* Back to Login */}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-all duration-200"
            >
              <ArrowLeft size={20} />
              Quay lại Đăng nhập
            </Link>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
