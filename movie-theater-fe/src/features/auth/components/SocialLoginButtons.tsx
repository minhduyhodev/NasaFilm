import React from 'react';
import { motion } from 'framer-motion';

interface SocialLoginButtonsProps {
  onGoogleLogin?: () => void;
  onAppleLogin?: () => void;
  loading?: boolean;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onGoogleLogin,
  onAppleLogin,
  loading = false,
}) => {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-gray-500 uppercase tracking-widest">
        Or continue with
      </p>

      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1" />
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">
              G
            </text>
          </svg>
          <span className="hidden sm:inline">Google</span>
        </motion.button>
      </div>
    </div>
  );
};
