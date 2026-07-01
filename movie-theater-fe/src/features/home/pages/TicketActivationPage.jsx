import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowRight, Check, HelpCircle, Loader2, Mail } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { vodService } from '../../../shared/services/vodService';
import { notificationService } from '../../../shared/services/notificationService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { resolveMovieOnlinePrice } from '../../../shared/utils/systemConfig';
import { matchBookingCode, getMoviePosterUrl, isVodTicketActive, canPurchaseVodTicket, canWatchOnlineDirectly, getOnlineWatchPath, setTemporaryVodToken, isLiveTicket } from '../utils/movieUtils';
import { VOD_PLAYBACK_STATE } from '../../../shared/constants/vod';
import { invalidateVodStatus } from '../hooks/useOnlineVodRoutes';
import projectorImg from '../../../shared/assets/about_projector.png';
import '../styles/home-premium.css';
import './TicketActivationPage.css';

const STEPS = [
  {
    num: '01',
    title: 'Kiểm tra email',
    desc: 'Sau khi mua vé online, mã vé VOD-XXXXXXXX được gửi tự động tới email đăng ký của bạn.',
  },
  {
    num: '02',
    title: 'Nhập mã vé',
    desc: 'Mở email, sao chép mã VOD-XXXXXXXX hoặc mã booking UUID rồi nhập vào ô bên dưới.',
  },
  {
    num: '03',
    title: 'Xem phim',
    desc: 'Hệ thống xác nhận qua API VOD rồi chuyển bạn tới trang phát.',
  },
];

const maskEmail = (email) => {
  if (!email) return 'email đã đăng ký';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const hidden = '*'.repeat(Math.max(1, local.length - visible.length));
  return `${visible}${hidden}@${domain}`;
};

const FEATURES = ['Sẵn sàng 4K Ultra HD', 'Kích hoạt tức thì', 'Tương thích nhiều thiết bị'];

const EXPIRED_TICKET_MESSAGE = 'Vé xem phim của bạn đã hết hạn. Vui lòng mua lại vé';

const isExpiredTicketError = (message) =>
  typeof message === 'string' &&
  (message.includes('hết hạn') || message.toLowerCase().includes('expired'));

const formatAccessKey = (value) => value.toUpperCase().replace(/\s+/g, '').slice(0, 40);

const TicketActivationPage = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthContext();
  const [movie, setMovie] = useState(null);
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [vodStatus, setVodStatus] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await movieService.getMovieDetail(movieId);
        setMovie(data);

        if (isAuthenticated) {
          try {
            const status = await vodService.getStatus(movieId);
            setVodStatus(status);
          } catch {
            setVodStatus(null);
          }
        } else {
          setVodStatus(null);
        }
      } catch {
        setMovie(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (movieId) load();
  }, [movieId, isAuthenticated]);

  const handleBuyOnline = () => {
    if (!isAuthenticated) {
      notificationService.info('Vui lòng đăng nhập để mua vé xem phim Online.');
      navigate('/login', { state: { from: `/online/activate/${movieId}` } });
      return;
    }
    if (!movie) return;
    navigate('/checkout', {
      state: {
        isVod: true,
        movieUuid: movie.uuid,
        movie: movie.title,
        moviePoster: getMoviePosterUrl(movie),
        movieRating: movie.rating,
        movieFormat: 'VOD 4K',
        movieAgeRestriction: movie.ageRestriction || 'P',
        totalAmount: resolveMovieOnlinePrice(movie),
        date: 'Mọi lúc, mọi nơi',
        showtime: 'Xem trực tuyến',
        theater: 'Trình phát video NASA VOD',
        selectedSeats: [],
        durationMinutes: movie.durationMinutes || 120,
      },
    });
  };

  const handleResendTicketEmail = async () => {
    if (!isAuthenticated) {
      notificationService.info('Vui lòng đăng nhập để nhận mã vé qua email.');
      navigate('/login', { state: { from: `/online/activate/${movieId}` } });
      return;
    }

    setIsResending(true);
    setError('');
    try {
      await vodService.resendTicketEmail(movieId);
      notificationService.success(`Mã vé đã được gửi tới ${maskEmail(user?.email)}. Vui lòng kiểm tra hộp thư.`);
    } catch (err) {
      setError(err?.message || 'Không thể gửi email mã vé. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');

    const code = formatAccessKey(accessKey);
    if (code.length < 8) {
      setError('Vui lòng nhập mã vé (VOD-XXXXXXXX hoặc mã booking).');
      return;
    }

    if (!isAuthenticated) {
      notificationService.info('Vui lòng đăng nhập để kích hoạt vé xem phim.');
      navigate('/login', { state: { from: `/online/activate/${movieId}` } });
      return;
    }

    setIsActivating(true);
    try {
      const bookings = await vodService.getMyBookings();
      const matched = (bookings || []).find((b) => matchBookingCode(b, code, movieId));

      if (!matched) {
        setError('Không tìm thấy vé online khớp mã này cho phim đang chọn.');
        return;
      }
      if (!isLiveTicket(matched)) {
        setError(EXPIRED_TICKET_MESSAGE);
        return;
      }

      const status = await vodService.getStatus(movieId);
      if (!status?.hasPurchased) {
        setError('Vé đã khớp nhưng chưa có quyền xem online cho phim này. Hãy mua vé online trước.');
        return;
      }
      if (status?.playbackState === VOD_PLAYBACK_STATE.EXPIRED) {
        setError(EXPIRED_TICKET_MESSAGE);
        return;
      }

      if (canWatchOnlineDirectly(status)) {
        invalidateVodStatus(movieId);
        navigate(getOnlineWatchPath(movieId));
        return;
      }

      setTemporaryVodToken(movieId, matched.bookingUuid);
      invalidateVodStatus(movieId);
      notificationService.success('Xác thực mã vé thành công! Nhấn Play để bắt đầu xem.');
      navigate(getOnlineWatchPath(movieId));
    } catch (err) {
      setError(
        isExpiredTicketError(err?.message)
          ? EXPIRED_TICKET_MESSAGE
          : err?.message || 'Không thể kích hoạt mã. Vui lòng thử lại.'
      );
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="ticket-activation-page min-h-screen flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="ticket-activation-page min-h-screen text-white">
        <main className="pt-28 px-4 text-center">
          <p className="text-lg font-semibold">Không tìm thấy phim.</p>
          <Link to="/online" className="inline-block mt-4 text-red-500 hover:text-red-400">
            Quay lại trang trực tuyến
          </Link>
        </main>
      </div>
    );
  }

  const poster = getMoviePosterUrl(movie);
  const ticketActive = isVodTicketActive(vodStatus);
  const showBuyButton = canPurchaseVodTicket(vodStatus);

  return (
    <div className="ticket-activation-page text-white min-h-screen">

      <main className="pt-24 pb-16 px-4 md:px-8 lg:px-20">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <section className="mb-12 md:mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500 mb-3">
              Kích hoạt vé trực tuyến
            </p>
            <h1 className="activation-hero-title">
              Mở khóa quyền<br />xem phim online
            </h1>
            <p className="mt-4 max-w-2xl text-sm md:text-base text-white/55 leading-relaxed">
              Nhập mã vé vật lý hoặc mã xác nhận đặt vé để truy cập phim{' '}
              <span className="text-white font-semibold">{movie.title}</span> với chất lượng 4K
              và nội dung độc quyền trên NASAFilm.
            </p>
            {poster && (
              <div className="mt-6 flex items-center gap-4">
                <img src={poster} alt={movie.title} className="h-20 w-14 object-cover rounded border border-white/10" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Phim đang kích hoạt</p>
                  <p className="font-bold text-white uppercase">{movie.title}</p>
                </div>
              </div>
            )}
          </section>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left - Form */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleActivate} className="activation-panel">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 mb-3">
                  Nhập mã vé online (VOD-XXXXXXXX)
                </label>
                <div className="activation-input-wrap mb-4">
                  <KeyRound className="h-5 w-5 text-red-500 shrink-0" />
                  <input
                    type="text"
                    value={accessKey}
                    onChange={(e) => {
                      setAccessKey(formatAccessKey(e.target.value));
                      setError('');
                    }}
                    placeholder="VOD-XXXXXXXX hoặc mã booking"
                    className="activation-input"
                    maxLength={40}
                    autoComplete="off"
                  />
                </div>

                {ticketActive && (
                  <div className="mb-4 rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                    <p>
                      Bạn đã có vé online cho phim này. Mã vé đã được gửi tới{' '}
                      <strong>{maskEmail(user?.email)}</strong>.
                    </p>
                    <p className="mt-2 text-xs text-sky-200/80">
                      Kiểm tra hộp thư (kể cả Spam/Quảng cáo), sao chép mã vé rồi nhập vào ô phía trên.
                    </p>
                    {vodStatus?.playbackState === 'WAITING_FOR_PLAY' && (
                    <button
                      type="button"
                      onClick={handleResendTicketEmail}
                      disabled={isResending}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-sky-200 hover:bg-sky-500/15 disabled:opacity-60"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <Mail className="h-3.5 w-3.5" />
                          Gửi lại mã vé qua email
                        </>
                      )}
                    </button>
                    )}
                  </div>
                )}

                {error && (
                  <p className="mb-4 text-sm text-red-400 font-medium">{error}</p>
                )}

                <button type="submit" disabled={isActivating} className="activation-btn">
                  {isActivating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kích hoạt...
                    </>
                  ) : (
                    <>
                      Kích hoạt ngay
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="mt-5 flex flex-wrap gap-2">
                  {FEATURES.map((f) => (
                    <span key={f} className="activation-badge">
                      <Check className="h-3.5 w-3.5 text-red-500" />
                      {f}
                    </span>
                  ))}
                </div>
              </form>

              {showBuyButton && (
              <div className="activation-btn-buy-wrap">
                <button
                  type="button"
                  onClick={handleBuyOnline}
                  className="activation-btn-buy"
                >
                  Vé xem online
                </button>
              </div>
              )}

            </div>

            {/* Right - How it works */}
            <div className="lg:col-span-5 space-y-5">
              <div className="activation-panel">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="h-5 w-5 text-red-500" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Hướng dẫn</h2>
                </div>
                <div className="space-y-6">
                  {STEPS.map((step) => (
                    <div key={step.num} className="flex gap-4">
                      <span className="activation-step-num shrink-0">{step.num}</span>
                      <div>
                        <h3 className="text-sm font-black uppercase text-red-500 tracking-wide">{step.title}</h3>
                        <p className="mt-1 text-sm text-white/50 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/faq"
                  className="inline-block mt-6 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-400"
                >
                  Cần hỗ trợ? Trung tâm trợ giúp →
                </Link>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-white/5 min-h-[160px]">
                <img src={projectorImg} alt="Pro membership" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="relative p-6 mt-16 md:mt-24">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Thành viên Pro</p>
                  <p className="mt-1 text-lg font-black uppercase text-white">Truy cập không giới hạn các suất công chiếu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketActivationPage;
