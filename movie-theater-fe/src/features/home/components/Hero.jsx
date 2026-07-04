import React, { useEffect, useRef, useState } from 'react';

const Hero = () => {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;

    let cancelled = false;
    const loadVideo = () => {
      import('../../../shared/assets/Interstellar-Trailer.mp4?url')
        .then((mod) => {
          if (!cancelled) setVideoUrl(mod.default);
        })
        .catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(loadVideo, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timerId = window.setTimeout(loadVideo, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !videoUrl) return undefined;

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
  }, [reduceMotion, videoUrl]);

  return (
    <section className="relative min-h-[90vh] md:min-h-screen w-full flex items-center pt-24 pb-32 overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        {videoUrl && !reduceMotion && (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-neutral-950/25" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-20 w-full flex flex-col justify-center h-full">
        <div className="max-w-2xl text-left space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-600/10 text-red-400 text-xs font-extrabold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            HỆ THỐNG RẠP CHIẾU PHIM HIỆN ĐẠI
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7.5xl font-black uppercase tracking-tight text-white leading-[1.05]">
            VŨ TRỤ ĐIỆN ẢNH <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
              TRONG TẦM TAY
            </span>
          </h1>

          <p className="text-sm md:text-base text-gray-300 max-w-lg leading-relaxed font-medium">
            Trải nghiệm điện ảnh đỉnh cao với hệ thống rạp hiện đại, đặt vé nhanh chóng và thưởng thức phim bom tấn mới nhất.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
