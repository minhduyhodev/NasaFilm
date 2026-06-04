import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthCard } from '../components/AuthCard';
import { AuthInput } from '../components/AuthInput';
import { forgotPasswordSchema } from '../utils/validation';
import { authService } from '../api/authService';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword({ email: data.email });
      setSuccessMessage(
        `Recovery code sent to ${data.email}. Please check your email.`
      );
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send recovery code. Please try again.';
      setError('email', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showHero={false}>
      <AuthCard
        title="Forgot Password?"
        subtitle="Enter your registered email to receive a recovery code"
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
                Recovery Code Sent!
              </h3>
              <p className="text-gray-400">{successMessage}</p>
            </div>

            {/* Redirect Info */}
            <motion.div
              animate={{ opacity: [0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-center text-sm text-gray-500"
            >
              Redirecting to login...
            </motion.div>

            {/* Manual redirect button */}
            <Link
              to="/auth/login"
              className="block w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 text-center"
            >
              Back to Login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Input */}
            <AuthInput
              {...register('email')}
              label="Email Address"
              placeholder="name@example.com"
              type="email"
              icon={<Mail size={20} />}
              error={errors.email}
            />

            {/* Recovery Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
            >
              <p className="text-sm text-blue-300">
                We'll send you a recovery code to reset your password. Make sure
                you have access to this email address.
              </p>
            </motion.div>

            {/* Send Code Button */}
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
                  Sending...
                </span>
              ) : (
                'Send Recovery Code'
              )}
            </motion.button>

            {/* Back to Login */}
            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-all duration-200"
            >
              <ArrowLeft size={20} />
              Back to Login
            </Link>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
