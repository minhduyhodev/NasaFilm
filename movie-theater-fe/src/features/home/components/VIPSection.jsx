import React from 'react';
import { Check } from 'lucide-react';
import memberRatingImg from '../../../shared/assets/MemberRating.jpg';

const VIPSection = () => {
  return (
    <section className="grid gap-6 lg:grid-cols-2 lg:items-center">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.28em] text-red-300/90">Khu Vực VIP</div>
        <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Trải nghiệm ghế ngồi cao cấp, riêng tư và đẳng cấp</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 md:text-base">
          Dịch vụ VIP được thiết kế cho trải nghiệm xem phim sang trọng: ghế da êm, không gian riêng, phục vụ tại chỗ và lối đi ưu tiên.
        </p>

        <ul className="mt-6 space-y-3 text-sm text-white/80">
          {[
            'Ghế recliner êm ái và riêng tư',
            'Phục vụ đồ ăn, nước uống tại chỗ',
            'Lounge riêng dành cho thành viên VIP',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <Check className="h-4 w-4" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button className="mt-7 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#10131d] transition hover:-translate-y-0.5">
          Khám Phá Ngay
        </button>
      </div>

      <div className="relative overflow-hidden rounded-[32px] shadow-[0_25px_50px_rgba(0,0,0,0.5)]">
        <img
          src={memberRatingImg}
          alt="VIP cinema seats"
          className="h-[320px] w-full object-cover md:h-[420px] transition-transform duration-1000 hover:scale-[1.02]"
        />

        <div className="absolute bottom-7 left-7 rounded-2xl bg-black/60 px-5 py-3.5 backdrop-blur-xl border border-white/10 text-left">
          <div className="text-2xl font-black text-white font-heading">4.9/5</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-bold mt-0.5">Đánh Giá Thành Viên</div>
        </div>
      </div>
    </section>
  );
};

export default VIPSection;
