import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../../../auth/api/authService';
import { useAuthContext } from '../../../auth/hooks/useAuthContext';
import memberRatingImg from '../../../../shared/assets/MemberRating.jpg';

const OnlineVIPSection = () => {
  const { isAuthenticated } = useAuthContext();
  const [userScore, setUserScore] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUserScore(null);
      return;
    }
    authService
      .getProfile()
      .then((data) => setUserScore(data?.score ?? 0))
      .catch(() => setUserScore(null));
  }, [isAuthenticated]);

  const memberTier = userScore != null && userScore >= 10000 ? "NASA'VIP" : "NASA'FRIEND";

  return (
    <section className="grid gap-6 lg:grid-cols-2 lg:items-center">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.28em] text-red-300/90">Khu Vực VIP</div>
        <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
          Trải nghiệm xem online cao cấp, riêng tư và đẳng cấp
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 md:text-base">
          Tích lũy điểm thành viên khi mua vé online, nhận ưu đãi độc quyền và trải nghiệm dịch vụ VIP tại rạp NASA Film.
        </p>

        <ul className="mt-6 space-y-3 text-sm text-white/80">
          {[
            'Tích điểm mỗi lần mua vé xem online',
            'Ưu đãi và voucher dành riêng thành viên',
            'Nâng hạng NASA\'VIP với quyền lợi cao cấp',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <Check className="h-4 w-4" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Link
          to="/about"
          className="mt-7 inline-block rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#10131d] transition hover:-translate-y-0.5"
        >
          Khám phá ngay
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[32px] shadow-[0_25px_50px_rgba(0,0,0,0.5)]">
        <img
          src={memberRatingImg}
          alt="VIP cinema seats"
          className="h-[320px] w-full object-cover md:h-[420px] transition-transform duration-1000 hover:scale-[1.02]"
        />

        {isAuthenticated && userScore != null ? (
          <div className="absolute bottom-7 left-7 rounded-2xl bg-black/60 px-5 py-3.5 backdrop-blur-xl border border-white/10 text-left">
            <div className="text-2xl font-black text-white">{userScore.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-bold mt-0.5">
              Điểm tích lũy · {memberTier}
            </div>
          </div>
        ) : (
          <div className="absolute bottom-7 left-7 rounded-2xl bg-black/60 px-5 py-3.5 backdrop-blur-xl border border-white/10 text-left">
            <div className="text-2xl font-black text-white">4.9/5</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-bold mt-0.5">
              Đánh giá thành viên
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default OnlineVIPSection;
