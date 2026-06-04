import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';



export const AuthLayout = ({
  children,
  showHero = true,
  heroTitle = 'THDPV CINEMA',
  heroDescription = 'Experience cinema like never before. Exclusive premieres, VIP lounges, and curated events.',
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black overflow-hidden">
      {/* Cinematic background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Spotlight effect */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-red-600/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl opacity-30"></div>

        {/* Cinema seats pattern background */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cinema-seats" x="50" y="50" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect x="10" y="10" width="30" height="30" fill="none" stroke="white" strokeWidth="1" rx="5" />
                <rect x="60" y="10" width="30" height="30" fill="none" stroke="white" strokeWidth="1" rx="5" />
                <rect x="10" y="60" width="30" height="30" fill="none" stroke="white" strokeWidth="1" rx="5" />
                <rect x="60" y="60" width="30" height="30" fill="none" stroke="white" strokeWidth="1" rx="5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cinema-seats)" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {showHero ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block text-white"
              >
                <div className="space-y-6">
                  <div>
                    <motion.div
                      className="inline-block mb-4"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="px-3 py-1 text-sm font-semibold text-red-500 bg-red-500/10 rounded-full border border-red-500/20">
                        PREMIER EXPERIENCE
                      </span>
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
                      Elevate Every Frame.
                    </h1>
                    <p className="text-lg text-gray-300 leading-relaxed">
                      {heroDescription}
                    </p>
                  </div>

                  {/* Decorative line */}
                  <div className="pt-4">
                    <div className="h-1 w-24 bg-gradient-to-r from-red-600 to-red-600/0"></div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-4 pt-8">
                    {['Exclusive Screenings', 'VIP Amenities', 'Premium Access'].map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        <span className="text-gray-400">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Form Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {children}
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
