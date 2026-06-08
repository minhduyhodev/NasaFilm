import React from 'react';
import { motion } from 'framer-motion';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.805 12.23c0-.71-.064-1.39-.182-2.045H12v3.87h5.498a4.702 4.702 0 0 1-2.036 3.086v2.56h3.3c1.93-1.777 3.043-4.394 3.043-7.471Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.76 0 5.074-.914 6.762-2.47l-3.3-2.56c-.915.613-2.084.975-3.462.975-2.66 0-4.914-1.797-5.72-4.213H2.87v2.64A10.2 10.2 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.28 13.732A6.13 6.13 0 0 1 5.96 11.99c0-.606.11-1.195.32-1.742V7.608H2.87a10.19 10.19 0 0 0 0 8.765l3.41-2.64Z"
    />
    <path
      fill="#EA4335"
      d="M12 6.035c1.5 0 2.847.516 3.908 1.529l2.93-2.93C17.07 2.98 14.758 2 12 2A10.2 10.2 0 0 0 2.87 7.608l3.41 2.64C7.086 7.832 9.34 6.035 12 6.035Z"
    />
  </svg>
);



export const SocialLoginButtons = ({
  onGoogleLogin,
  onAppleLogin,
  googleButtonId,
  loading = false,
  isPrioritized = false,
}) => {
  const showGoogle = !!onGoogleLogin;
  const showApple = !!onAppleLogin;
  const count = [showGoogle, showApple].filter(Boolean).length;

  if (count === 0) return null;

  return (
    <div className="space-y-3">
      {!isPrioritized && (
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest">
          Or continue with
        </p>
      )}

      <div className={`grid ${count === 2 && !isPrioritized ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {showGoogle && (
          <div className="relative space-y-3">
            <div
              id={googleButtonId}
              aria-hidden="true"
              className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
            />
            <motion.button
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={onGoogleLogin}
              disabled={loading}
              className="auth-quick-btn google"
            >
              <GoogleIcon />
              <span>{isPrioritized ? 'Đăng nhập bằng Google' : 'Choose Google account'}</span>
            </motion.button>
          </div>
        )}

        {showApple && (
          <motion.button
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={onAppleLogin}
            disabled={loading}
            className="auth-quick-btn apple"
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

