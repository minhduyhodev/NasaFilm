import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthCard } from '../components/AuthCard';
import { AuthInput } from '../components/AuthInput';
import { PasswordStrength } from '../components/PasswordStrength';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { registerSchema } from '../utils/validation';
import { authService } from '../api/authService';
import './RegisterPage.css';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2-step verification state
  const [step, setStep] = useState(1); // 1: Info Form, 2: OTP Code
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpValues, setOtpValues] = useState(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authService.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });

      setRegisteredEmail(data.email);
      setStep(2);
      setTimer(60);
      setOtpValues(Array(6).fill(''));
      setOtpError('');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.';
      setError('email', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Only allow single digit
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned === '' && value !== '') return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = cleaned;
    setOtpValues(newOtpValues);
    setOtpError('');

    // Auto focus next input
    if (cleaned !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpValues[index] === '' && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
      setOtpError('');
    }
  };

  const onVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length < 6) {
      setOtpError('Vui lòng nhập đầy đủ mã xác thực 6 chữ số.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyRegister(registeredEmail, code);
      navigate('/auth/login', {
        state: { message: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.' },
      });
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Xác thực OTP thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setIsLoading(true);
    try {
      await authService.register({
        fullName: watch('fullName'),
        email: registeredEmail,
        password: watch('password'),
      });
      setTimer(60);
      setOtpValues(Array(6).fill(''));
      setOtpError('');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Gửi lại mã xác thực thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('Google signup clicked');
  };

  return (
    <AuthLayout
      showHero={true}
      heroTitle="NASAFILM"
      heroDescription="Trải nghiệm điện ảnh chưa từng có trước đây. Ra mắt độc quyền, phòng chờ VIP và các sự kiện tuyển chọn đặc biệt."
    >
      {step === 1 ? (
        <AuthCard
          title="Đăng Ký Tài Khoản"
          subtitle="Tham gia cộng đồng điện ảnh hàng đầu"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Full Name Input */}
            <AuthInput
              {...register('fullName')}
              label="Họ và Tên"
              placeholder="John Doe"
              type="text"
              icon={<User size={20} />}
              error={errors.fullName}
            />

            {/* Email Input */}
            <AuthInput
              {...register('email')}
              label="Địa chỉ Email"
              placeholder="name@email.com"
              type="email"
              icon={<Mail size={20} />}
              error={errors.email}
            />

            {/* Phone Number Input */}
            <AuthInput
              {...register('phoneNumber')}
              label="Số điện thoại (Không bắt buộc)"
              placeholder="+84 900-000-000"
              type="tel"
              icon={<Phone size={20} />}
              error={errors.phoneNumber}
            />

            {/* Password Input */}
            <AuthInput
              {...register('password')}
              label="Mật khẩu"
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

            {/* Terms Agreement */}
            <motion.label
              whileHover={{ scale: 1.02 }}
              className="auth-terms-label group"
            >
              <input
                type="checkbox"
                {...register('agreeToTerms')}
                className="auth-terms-checkbox"
              />
              <span className="auth-terms-text">
                Tôi đồng ý với{' '}
                <a href="#" className="auth-terms-link">
                  Điều khoản dịch vụ
                </a>{' '}
                và{' '}
                <a href="#" className="auth-terms-link">
                  Chính sách bảo mật
                </a>
              </span>
            </motion.label>

            {errors.agreeToTerms && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-error-msg"
              >
                <span className="auth-error-dot"></span>
                {errors.agreeToTerms.message}
              </motion.p>
            )}

            {/* Create Account Button */}
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
                  Đang tạo tài khoản...
                </span>
              ) : (
                'Đăng Ký'
              )}
            </motion.button>

            {/* Divider */}
            <div className="auth-divider-wrapper">
              <div className="auth-divider-line"></div>
            </div>

            {/* Social Login */}
            <SocialLoginButtons
              onGoogleLogin={handleGoogleLogin}
              loading={isLoading}
            />

            {/* Sign In Link */}
            <div className="auth-footer">
              <span className="auth-footer-text">Đã có tài khoản? </span>
              <Link
                to="/auth/login"
                className="auth-footer-link"
              >
                Đăng nhập
              </Link>
            </div>
          </form>
        </AuthCard>
      ) : (
        <AuthCard
          title="Xác Minh Email"
          subtitle={`Chúng tôi đã gửi mã xác minh OTP gồm 6 chữ số tới: ${registeredEmail}`}
        >
          <form onSubmit={onVerifyOtpSubmit} className="auth-form">
            <div className="otp-inputs-container">
              {otpValues.map((val, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  maxLength="1"
                  value={val}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="otp-input"
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {otpError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-error-msg justify-center text-center w-full"
                style={{ justifyContent: 'center' }}
              >
                <span className="auth-error-dot"></span>
                {otpError}
              </motion.p>
            )}

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
                  Đang xác minh OTP...
                </span>
              ) : (
                'Xác Minh & Kích Hoạt Tài Khoản'
              )}
            </motion.button>

            <div className="otp-resend-container">
              {timer > 0 ? (
                <span className="otp-timer">Gửi lại mã sau {timer} giây</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="otp-resend-btn"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            <div className="auth-footer">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtpValues(Array(6).fill(''));
                  setOtpError('');
                }}
                className="auth-back-btn"
                disabled={isLoading}
              >
                Quay lại trang Đăng ký
              </button>
            </div>
          </form>
        </AuthCard>
      )}
    </AuthLayout>
  );
};

export default RegisterPage;
