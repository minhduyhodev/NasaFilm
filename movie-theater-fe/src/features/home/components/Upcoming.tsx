import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import xebayImg from '../../../shared/assets/xebay.jpg';

const Upcoming: React.FC = () => {
  const target = new Date();
  target.setDate(target.getDate() + 5);

  const [diff, setDiff] = useState<number>(target.getTime() - Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setDiff(target.getTime() - Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [target]);

  const format = (milliseconds: number) => {
    if (milliseconds <= 0) return '00:00:00';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        className="overflow-hidden rounded-[28px] border border-white/10 bg-[#121521] shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4 md:px-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-red-300/90">Phim Sắp Chiếu</div>
            <h3 className="mt-2 text-2xl font-black text-white md:text-4xl">Đường Đua Nghẹt Thở</h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Công chiếu sau</div>
            <div className="mt-1 font-mono text-xl font-black text-white md:text-2xl">{format(diff)}</div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <img
            src={xebayImg}
            alt="Upcoming movie"
            className="h-[240px] w-full rounded-[22px] object-cover md:h-[320px]"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#111827] transition hover:-translate-y-0.5">
              Nhắc Tôi
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Xem Trailer
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#171b29] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="text-sm uppercase tracking-[0.28em] text-white/50">GÓI GIA ĐÌNH</div>
          <div className="mt-3 text-3xl font-black text-white">$89.00</div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">4 Vé, 4 Bắp, 4 Nước. Ưu đãi dành cho gia đình và nhóm bạn.</p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#171b29] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="text-sm uppercase tracking-[0.28em] text-white/50">Đêm Công Chiếu</div>
          <p className="mt-3 text-sm leading-6 text-white/60">Giữ chỗ sớm cho suất chiếu giới hạn với trải nghiệm VIP và quà tặng độc quyền.</p>
        </div>
      </div>
    </section>
  );
};

export default Upcoming;
