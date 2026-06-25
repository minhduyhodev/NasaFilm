import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const HERO_VIDEO_URL = '/Interstellar-Trailer.mp4';

const Hero = () => {
  const reduceMotion = useReducedMotion();
  const [videoSrc, setVideoSrc] = useState('');

  useEffect(() => {
    if (reduceMotion) return undefined;

    let cancelled = false;
    const loadVideo = () => {
      if (!cancelled) setVideoSrc(HERO_VIDEO_URL);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(loadVideo, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timerId = window.setTimeout(loadVideo, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [reduceMotion]);

  return (
    <section className="relative min-h-[90vh] md:min-h-screen w-full flex items-center pt-24 pb-32 overflow-hidden bg-black">
      {/* 1. Background Video Layer */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-black" />
        )}
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
            VŨ TRỤ ĐIỆN ẢNH <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
              TRONG TẦM TAY
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm md:text-base text-gray-300 max-w-lg leading-relaxed font-medium"
          >
            Trải nghiệm điện ảnh đỉnh cao với hệ thống rạp hiện đại, đặt vé nhanh chóng và thưởng thức phim bom tấn mới nhất.
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
