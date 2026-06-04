import React from 'react';
import { motion } from 'framer-motion';



export const SocialLoginButtons = ({
  onGoogleLogin,
  onAppleLogin,
  loading = false,
}) => {
  const showGoogle = !!onGoogleLogin;
  const showApple = !!onAppleLogin;
  const count = [showGoogle, showApple].filter(Boolean).length;

  if (count === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-gray-500 uppercase tracking-widest">
        Or continue with
      </p>

      <div className={`grid ${count === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {showGoogle && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">
                G
              </text>
            </svg>
            <span>Google</span>
          </motion.button>
        )}

        {showApple && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAppleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 12.37,6.86 13.89,6.88C14.61,6.9 16.32,7.17 17.43,8.79C17.34,8.84 15.22,10.08 15.24,12.55C15.26,15.52 17.78,16.5 17.81,16.52C17.79,16.58 17.4,17.92 18.71,19.5M15.97,4.17C16.63,3.37 17.07,2.28 16.95,1C16,1.04 14.9,1.6 14.24,2.38C13.68,3.04 13.19,4.14 13.34,5.39C14.39,5.47 15.4,4.88 15.97,4.17Z" />
            </svg>
            <span>Apple</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

