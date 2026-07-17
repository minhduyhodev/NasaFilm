import { motion } from 'framer-motion';

export const AuthCard = ({ children, title, subtitle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="relative">
        {/* Glassy background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl blur-xl opacity-20"></div>

        {/* Card content */}
        <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {/* Content */}
          <div className="relative z-10 space-y-4">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            {/* Children */}
            <div>{children}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default AuthCard;
