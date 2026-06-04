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
import { registerSchema, RegisterFormData } from '../utils/validation';
import { authService } from '../api/authService';

export const RegisterPage: React.FC = () => {
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
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            className="flex items-start gap-3 cursor-pointer group"
          >
            <input
              type="checkbox"
              {...register('agreeToTerms')}
              className="w-4 h-4 mt-1 bg-white/10 border border-white/20 rounded cursor-pointer accent-red-600 flex-shrink-0"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
              I agree to the{' '}
              <a href="#" className="text-red-500 hover:text-red-400">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-red-500 hover:text-red-400">
                Privacy Policy
              </a>
            </span>
          </motion.label>

          {errors.agreeToTerms && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {errors.agreeToTerms.message}
            </motion.p>
          )}

          {/* Create Account Button */}
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
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
          </div>

          {/* Social Login */}
          <SocialLoginButtons
            onGoogleLogin={handleGoogleLogin}
            loading={isLoading}
          />

          {/* Sign In Link */}
          <div className="text-center pt-2">
            <span className="text-gray-400">Already have an account? </span>
            <Link
              to="/auth/login"
              className="text-red-500 hover:text-red-400 font-semibold transition-colors"
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
