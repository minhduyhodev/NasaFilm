import React, { useState } from 'react';
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

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authService.register({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        confirmPassword: data.confirmPassword,
        agreeToTerms: data.agreeToTerms,
      });

      // Show success message and redirect to login
      navigate('/auth/login', {
        state: { message: 'Registration successful! Please log in.' },
      });
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

  const handleGoogleLogin = async () => {
    // Implement Google OAuth registration
    console.log('Google signup clicked');
  };

  return (
    <AuthLayout
      showHero={true}
      heroTitle="NASAFILM"
      heroDescription="Experience cinema like never before. Exclusive premieres, VIP lounges, and curated events."
    >
      <AuthCard
        title="Create Account"
        subtitle="Join the premiere film community"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          {/* Full Name Input */}
          <AuthInput
            {...register('fullName')}
            label="Full Name"
            placeholder="John Doe"
            type="text"
            icon={<User size={20} />}
            error={errors.fullName}
          />

          {/* Email Input */}
          <AuthInput
            {...register('email')}
            label="Email Address"
            placeholder="name@email.com"
            type="email"
            icon={<Mail size={20} />}
            error={errors.email}
          />

          {/* Phone Number Input */}
          <AuthInput
            {...register('phoneNumber')}
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            type="tel"
            icon={<Phone size={20} />}
            error={errors.phoneNumber}
          />

          {/* Password Input */}
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
            label="Confirm Password"
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
              I agree to the{' '}
              <a href="#" className="auth-terms-link">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="auth-terms-link">
                Privacy Policy
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
                Creating Account...
              </span>
            ) : (
              'Create Account'
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
            <span className="auth-footer-text">Already have an account? </span>
            <Link
              to="/auth/login"
              className="auth-footer-link"
            >
              Sign In
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};

export default RegisterPage;
