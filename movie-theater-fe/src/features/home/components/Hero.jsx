import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import heroVideoUrl from '../../../shared/assets/Interstellar-Trailer.mp4?url';

const Hero = () => {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef(null);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    const playVideo = () => {
      video.play().catch(() => {});
    };

    video.addEventListener('canplay', playVideo);
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      playVideo();
    }

    return () => {
      video.removeEventListener('canplay', playVideo);
    };
  }, [reduceMotion]);

  return (
    <section className="relative min-h-[90vh] md:min-h-screen w-full flex items-center pt-24 pb-32 overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        {!reduceMotion && (
          <video
            ref={videoRef}
            src={heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-neutral-950/25" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-20 w-full flex flex-col justify-center h-full">
        <div className="max-w-2xl text-left space-y-4 md:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-600/10 text-red-400 text-xs font-extrabold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            HỆ THỐNG RẠP CHIẾU PHIM HIỆN ĐẠI
          </motion.div>

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
