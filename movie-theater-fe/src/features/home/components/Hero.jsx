import React from 'react';
import { motion } from 'framer-motion';
import interstellarTrailer from '../../../shared/assets/Interstellar-Trailer.mp4';

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] md:min-h-screen w-full flex items-center pt-24 pb-32 overflow-hidden bg-black">
      {/* 1. Background Video Layer */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <video
          src={interstellarTrailer}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Cinematic dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-950/40 to-neutral-950/70" />
      </div>

      {/* 2. Text Content Overlay Layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-20 w-full flex flex-col justify-center h-full">
        <div className="max-w-2xl text-left space-y-4 md:space-y-6">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-600/10 text-red-400 text-xs font-extrabold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
             HỆ THỐNG RẠP CHIẾU PHIM HIỆN ĐẠI
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7.5xl font-black uppercase tracking-tight text-white leading-[1.05]"
          >
            THẾ GIỚI ĐIỆN ẢNH <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
              TRONG TẦM TAY
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-white/70 font-medium tracking-wide max-w-xl"
          >
            Trải nghiệm những thước phim bom tấn đỉnh cao với hệ thống âm thanh vòm sống động và màn hình sắc nét tại NASA FILM.
          </motion.p>
          
        </div>
      </div>
    </section>
  );
};

export default Hero;
