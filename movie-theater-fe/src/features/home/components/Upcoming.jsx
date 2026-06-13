import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import xebayImg from '../../../shared/assets/xebay.jpg';
import { movieService } from '../../../shared/services/movieService';

const Upcoming = () => {
  const [upcomingMovie, setUpcomingMovie] = useState(null);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const data = await movieService.getMovies({ status: 'COMING_SOON', page: 0, size: 1 });
        if (data && data.content && data.content.length > 0) {
          setUpcomingMovie(data.content[0]);
        }
      } catch (err) {
        console.error("Failed to fetch upcoming movie from API:", err);
      }
    };
    fetchUpcoming();
  }, []);

  const targetDate = useMemo(() => {
    if (upcomingMovie && upcomingMovie.releaseDate) {
      const d = new Date(upcomingMovie.releaseDate);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    const defaultTarget = new Date();
    defaultTarget.setDate(defaultTarget.getDate() + 5);
    return defaultTarget;
  }, [upcomingMovie]);

  const [diff, setDiff] = useState(targetDate.getTime() - Date.now());

  useEffect(() => {
    setDiff(targetDate.getTime() - Date.now());
    const timerId = window.setInterval(() => {
      setDiff(targetDate.getTime() - Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [targetDate]);

  const formatCountdown = (milliseconds) => {
    if (milliseconds <= 0) return 'Đang chiếu';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
      return `${String(days).padStart(2, '0')} ngày ${String(hours).padStart(2, '0')} giờ`;
    }
    return `${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút`;
  };

  const displayPoster = (upcomingMovie && upcomingMovie.primaryMediaUrl) ? upcomingMovie.primaryMediaUrl : xebayImg;

  return (
    <section className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] items-start text-left">
      {/* Left Column: Asymmetrical Editorial Upcoming Showcase */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7 }}
        className="relative group flex flex-col md:flex-row gap-8 items-center md:items-stretch"
      >
        {/* Asymmetrical Big Poster Frame with Gradient Mask */}
        <div className="w-full md:w-3/5 aspect-[16/10] md:aspect-[3/4] overflow-hidden rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative">
          <img
            src={displayPoster}
            alt="Upcoming movie"
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          {/* Subtle vignette gradient mask */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        {/* Content details offset to the right */}
        <div className="w-full md:w-2/5 flex flex-col justify-center space-y-6 md:py-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Phim Sắp Chiếu</span>
            <h3 className="mt-2 text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight font-heading">
              {upcomingMovie ? upcomingMovie.title : 'Đường Đua Nghẹt Thở'}
            </h3>
          </div>

          {/* Large Editorial Countdown */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 block">Công chiếu sau</span>
            <span className="text-3xl md:text-4.5xl font-black text-white bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent font-heading">
              {formatCountdown(diff)}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <button className="rounded-full bg-red-600 hover:bg-red-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-all shadow-[0_10px_25px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95">
              Nhắc Tôi
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:scale-105">
              Xem Trailer
            </button>
          </div>
        </div>
      </motion.div>

      {/* Right Column: Premium Borderless Packages */}
      <div className="grid gap-6 w-full">
        {/* Family Combo Promo Block */}
        <div className="p-8 rounded-[28px] bg-[#111216]/40 backdrop-blur-xl border border-white/5 hover:border-red-500/10 transition-all duration-300">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Gói Ưu Đãi</span>
          <h4 className="mt-1.5 text-xl font-black text-white uppercase font-heading">Gói Gia Đình</h4>
          <div className="mt-3 text-3xl font-black text-white font-heading">350.000 đ</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs font-black text-gray-400">
            <span>4 vé</span>
            <span>•</span>
            <span>2 bắp</span>
            <span>•</span>
            <span>4 nước</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-400 font-medium">
            Tận hưởng trọn vẹn từng khoảnh khắc cùng người thân. Áp dụng cho đặt vé trực tuyến.
          </p>
        </div>

        {/* Premiere Night Promo Block */}
        <div className="p-8 rounded-[28px] bg-[#111216]/40 backdrop-blur-xl border border-white/5 hover:border-amber-500/10 transition-all duration-300">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Độc Quyền</span>
          <h4 className="mt-1.5 text-xl font-black text-white uppercase font-heading">Đêm Công Chiếu</h4>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            Giữ chỗ sớm cho suất chiếu giới hạn với trải nghiệm VIP và quà tặng độc quyền dành riêng cho thành viên.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Upcoming;
