import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export const AuthInput = React.forwardRef(
  (
    {
      label,
      placeholder,
      error,
      icon,
      showPasswordToggle,
      onPasswordToggle,
      showPassword,
      type,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full space-y-2"
      >
        {label && (
          <label className="block text-sm font-medium text-gray-200">
            {label}
          </label>
        )}

        <div className="relative group">
          {/* Animated border effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isFocused ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-transparent rounded-lg blur-sm pointer-events-none"
          ></motion.div>

          {/* Input container */}
          <div className="relative flex items-center">
            {icon && (
              <div className="absolute left-4 text-gray-400 group-focus-within:text-red-500 transition-colors">
                {icon}
              </div>
            )}

            <input
              ref={ref}
              type={showPasswordToggle && showPassword ? 'text' : type}
              placeholder={placeholder}
              className={`w-full px-4 ${icon ? 'pl-12' : ''} ${
                showPasswordToggle ? 'pr-12' : ''
              } py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all duration-200 ${
                error ? 'border-red-500/50' : ''
              } ${className}`}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />

            {showPasswordToggle && (
              <button
                type="button"
                onClick={onPasswordToggle}
                className="absolute right-4 text-gray-400 hover:text-red-500 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            {error.message}
          </motion.p>
        )}
      </motion.div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
