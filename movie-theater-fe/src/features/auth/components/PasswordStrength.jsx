import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';





const requirements = [
  { label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
  { label: 'Ít nhất một chữ cái viết hoa', test: (p) => /[A-Z]/.test(p) },
  { label: 'Ít nhất một chữ cái viết thường', test: (p) => /[a-z]/.test(p) },
  { label: 'Ít nhất một chữ số', test: (p) => /[0-9]/.test(p) },
  { label: 'Ít nhất một ký tự đặc biệt (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

export const PasswordStrength = ({
  password,
  showRequirements = true,
}) => {
  const metRequirements = requirements.filter((req) => req.test(password)).length;
  const strength = password.length === 0 ? 0 : Math.ceil((metRequirements / requirements.length) * 100);
  const strengthPercent = Math.min(strength, 100);

  const getStrengthColor = () => {
    if (strengthPercent < 40) return 'from-red-600 to-red-600';
    if (strengthPercent < 70) return 'from-yellow-600 to-yellow-600';
    return 'from-green-600 to-green-600';
  };

  const getStrengthText = () => {
    if (strengthPercent < 40) return 'Yếu';
    if (strengthPercent < 70) return 'Trung bình';
    return 'Mạnh';
  };

  if (!showRequirements && !password) return null;

  return (
    <div className="space-y-3">
      {password && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {/* Strength bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getStrengthColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${strengthPercent}%` }}
                transition={{ duration: 0.3 }}
              ></motion.div>
            </div>
            <span className="text-xs font-medium text-gray-400">
              {getStrengthText()}
            </span>
          </div>
        </motion.div>
      )}

      {showRequirements && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 pt-2"
        >
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Yêu cầu mật khẩu
          </p>
          <div className="grid grid-cols-1 gap-2">
            {requirements.map((req, index) => {
              const isMet = req.test(password);
              return (
                <motion.div
                  key={req.label}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-2 text-sm ${
                    isMet ? 'text-green-500' : 'text-gray-500'
                  }`}
                >
                  {isMet ? (
                    <Check size={16} className="flex-shrink-0" />
                  ) : (
                    <X size={16} className="flex-shrink-0" />
                  )}
                  {req.label}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
