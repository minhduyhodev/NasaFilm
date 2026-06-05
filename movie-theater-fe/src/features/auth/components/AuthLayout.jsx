import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SpaceBackground } from './SpaceBackground';

export const AuthLayout = ({
  children,
  showHero = true,
  heroTitle = 'NASAFILM',
  heroDescription = 'The most immersive cinema experience ever crafted for the digital age. Mission-critical quality, delivered directly to your home observatory.',
}) => {
  return (
    <div className="min-h-screen bg-[#030307] text-white overflow-hidden relative flex flex-col justify-between">
      {/* Dynamic Starry Canvas Background */}
      <SpaceBackground />

      {/* Cosmic spot lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl opacity-30"></div>
      </div>



      {/* Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-8 md:py-10">
        <div className="w-full max-w-7xl px-6 sm:px-8 lg:px-12">
          {showHero ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Side Hero */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block text-white"
              >
                <div className="space-y-6 max-w-lg">
                  <div>
                    <motion.div
                      className="inline-block mb-4"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-gray-400 bg-white/5 rounded-full border border-white/10 uppercase">
                        PREMIER EXPERIENCE
                      </span>
                    </motion.div>
                    <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-none mb-6">
                      NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Film</span>
                    </h1>
                    <p className="text-base text-gray-300 leading-relaxed font-medium">
                      {heroDescription}
                    </p>
                  </div>

                  {/* Decorative line */}
                  <div className="pt-2">
                    <div className="h-0.5 w-24 bg-gradient-to-r from-blue-500 to-transparent"></div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-4 pt-4">
                    {['Exclusive Screenings', 'VIP Amenities', 'Premium Access'].map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                        className="flex items-center gap-3.5"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                        <span className="text-gray-400 font-semibold text-sm">{feature}</span>
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
                className="flex justify-center lg:justify-end"
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
