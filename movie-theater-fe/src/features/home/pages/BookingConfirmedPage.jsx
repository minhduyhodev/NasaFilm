import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { movieService } from '../../../shared/services/movieService';
import { getMoviePosterUrl } from '../utils/movieUtils';
import './BookingConfirmedPage.css';

export const BookingConfirmedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [fetchedPoster, setFetchedPoster] = useState('');
  const bookingData = location.state;

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!bookingData?.bookingUuid) {
      navigate('/profile', { replace: true });
      return;
    }

    if (!bookingData.isVod) {
      navigate(`/pre-show/boarding/${bookingData.bookingUuid}`, {
        state: { justConfirmed: true },
        replace: true,
      });
    }
  }, [bookingData, navigate]);

  useEffect(() => {
    if (!bookingData?.isVod || !bookingData?.movieUuid || bookingData?.moviePoster) return undefined;
    let cancelled = false;
    movieService
      .getMovieDetail(bookingData.movieUuid)
      .then((detail) => {
        if (!cancelled) setFetchedPoster(getMoviePosterUrl(detail));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingData]);

  if (!bookingData?.isVod) {
    return null;
  }

  const {
    bookingUuid = '',
    movie = 'Phim đã đặt',
    moviePoster = '',
    movieRating = 'T16',
    date = 'Mọi lúc, mọi nơi',
    showtime = 'Xem trực tuyến',
    movieUuid = '',
  } = bookingData;

  const bookingId = `#CL-${bookingUuid.substring(0, 8).toUpperCase()}`;
  const displayPoster = moviePoster || fetchedPoster;

  return (
    <div className="bg-mesh min-h-screen flex flex-col justify-between">
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 md:px-16 lg:px-20 py-12 mt-12 w-full max-w-7xl mx-auto">
        <div className="booking-confirmed-ticket glass-panel max-w-4xl w-full rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl transition-all duration-300 text-left bg-[#101217] min-w-0">
          <div className="booking-confirmed-poster relative w-full md:w-2/5 h-72 md:h-auto overflow-hidden shrink-0 border-r border-white/5">
            {displayPoster ? (
              <img
                className="booking-confirmed-poster__image absolute inset-0 w-full h-full object-cover"
                alt="Poster phim"
                src={displayPoster}
              />
            ) : (
              <div className="booking-confirmed-poster__fallback absolute inset-0 bg-gradient-to-br from-neutral-900 via-[#121212] to-black" />
            )}
            <div className="booking-confirmed-poster__shade absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent" />
            <div className="booking-confirmed-poster__success absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="w-20 h-20 rounded-full border-4 border-[#ccc5bf] flex items-center justify-center neon-gold-glow bg-[#101217]/50">
                <svg className="w-12 h-12 text-[#ccc5bf]" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                  <path className="checkmark-animate" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className="booking-confirmed-details flex-grow p-6 sm:p-8 md:p-10 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center gap-3 mb-5 stagger-item" style={{ animationDelay: '0.1s' }}>
                <span className="text-[#ccc5bf] text-[10px] font-black tracking-widest uppercase">Trải nghiệm thượng lưu</span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              <h1 className="text-3xl font-black text-white mb-2 stagger-item" style={{ animationDelay: '0.2s' }}>
                Mua vé online thành công
              </h1>
              <p className="text-[#c8c5ca] text-xs font-semibold mb-8 stagger-item" style={{ animationDelay: '0.3s' }}>
                Mã VOD đã được gửi qua email. Kích hoạt vé để bắt đầu xem phim ngay.
              </p>

              <div className="booking-confirmed-grid grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 mb-8">
                <div className="booking-confirmed-field stagger-item min-w-0" style={{ animationDelay: '0.4s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Phim</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-white truncate">{movie}</span>
                    {movieRating && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        movieRating.toUpperCase() === 'P' ? 'bg-emerald-600 text-white'
                          : movieRating.toUpperCase().includes('T18') ? 'bg-red-600 text-white'
                            : 'bg-amber-600 text-white'
                      }`}
                      >
                        {movieRating}
                      </span>
                    )}
                  </div>
                </div>

                <div className="booking-confirmed-field stagger-item min-w-0" style={{ animationDelay: '0.5s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Thời gian</span>
                  <span className="text-sm font-bold text-white break-words">{showtime} • {date}</span>
                </div>

                <div className="booking-confirmed-field stagger-item min-w-0" style={{ animationDelay: '0.6s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Hình thức</span>
                  <span className="text-sm font-bold text-white break-words">Xem trực tuyến (VOD)</span>
                </div>

                <div className="booking-confirmed-field stagger-item min-w-0" style={{ animationDelay: '0.7s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Mã đơn</span>
                  <span className="text-sm font-bold text-[#ccc5bf] break-words">{bookingId}</span>
                </div>
              </div>

              <div className="booking-confirmed-qr flex items-start gap-4 p-4 glass-panel rounded-xl border-white/5 qr-pulse stagger-item bg-white/[0.01] min-w-0" style={{ animationDelay: '0.8s' }}>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <span className="block text-white text-xs font-bold mb-1">Mã vé đã gửi qua email</span>
                  <span className="text-[#c8c5ca] text-[9px] font-medium leading-relaxed block break-words">
                    Kiểm tra hộp thư đăng ký để lấy mã VOD, sau đó vào trang kích hoạt và nhập mã để bắt đầu xem phim.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 action-buttons-group stagger-item" style={{ animationDelay: '0.9s' }}>
              <button
                type="button"
                onClick={() => navigate(`/online/activate/${movieUuid}`)}
                className="w-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-700 transition-all duration-300 cursor-pointer active:scale-95 text-center"
              >
                Kích hoạt vé xem online
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/online')}
              className="booking-confirmed-skip mt-3 w-full border border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer active:scale-95"
            >
              Về trang online
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingConfirmedPage;
