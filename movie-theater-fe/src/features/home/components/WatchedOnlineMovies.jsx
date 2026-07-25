import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { vodService } from '../../../shared/services/vodService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import PosterImage from '../../../shared/components/PosterImage';

const isExpired = (expiresAt) =>
  Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());

const formatLastWatched = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const WatchedOnlineMovies = () => {
  const { isAuthenticated } = useAuthContext();
  const scrollerRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!isAuthenticated) {
        setHistory([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const items = await vodService.getHistory();
        if (active) setHistory(items || []);
      } catch {
        if (active) setHistory([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const watchedMovies = useMemo(
    () =>
      history.filter(
        (item) => Number(item.progressPercent || 0) >= 90 || isExpired(item.expiresAt),
      ),
    [history],
  );

  const scroll = (direction) => {
    scrollerRef.current?.scrollBy({
      left: direction === 'right' ? 340 : -340,
      behavior: 'smooth',
    });
  };

  const isEmpty = !isLoading && watchedMovies.length === 0;

  return (
    <section>
      <div className="section-heading-row">
        <div>
          <p className="online-catalog-eyebrow">Hoạt động của bạn</p>
          <h2 className="section-heading">Phim trực tuyến đã xem</h2>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-5 py-6 text-center">
          <p className="text-sm font-semibold text-white/60">
            {isAuthenticated
              ? 'Bạn chưa xem xong phim trực tuyến nào.'
              : 'Đăng nhập để xem lịch sử phim trực tuyến đã xem.'}
          </p>
          <p className="mt-1 text-xs text-white/35">
            {isAuthenticated
              ? 'Phim xem xong hoặc vé đã hết hạn sẽ được lưu tại đây.'
              : 'Lịch sử xem của bạn sẽ hiển thị tại đây sau khi đăng nhập.'}
          </p>
        </div>
      ) : (
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden md:flex absolute -left-3 top-[38%] -translate-y-1/2 z-10 h-9 w-9 items-center justify-center text-white/50 hover:text-white transition-colors"
          aria-label="Phim đã xem trước"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden md:flex absolute -right-3 top-[38%] -translate-y-1/2 z-10 h-9 w-9 items-center justify-center text-white/50 hover:text-white transition-colors"
          aria-label="Phim đã xem tiếp theo"
        >
          <ChevronRight size={28} />
        </button>

        <div ref={scrollerRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
          {isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex-none w-[72%] sm:w-[45%] md:w-[calc(25%-12px)]">
                  <div className="aspect-[16/9] rounded bg-white/5 animate-pulse" />
                </div>
              ))
            : watchedMovies.map((item) => {
                const expired = isExpired(item.expiresAt);
                const progress = Math.min(100, Math.max(0, Number(item.progressPercent || 0)));
                // Vé hết hạn vẫn vào được trang xem để đọc/gửi đánh giá (không phát lại được).
                const destination = `/watch/${item.movieUuid}`;

                return (
                  <Link
                    key={item.movieUuid}
                    to={destination}
                    className="flex-none w-[72%] sm:w-[45%] md:w-[calc(25%-12px)] group"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden rounded border border-white/5">
                      <PosterImage
                        src={item.primaryMediaUrl}
                        alt={item.movieTitle}
                        width={480}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
                        <CheckCircle2 size={12} />
                        {expired ? 'Đã hết lượt xem' : 'Đã xem'}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-xs font-bold text-white uppercase tracking-wide line-clamp-1 group-hover:text-red-400 transition-colors">
                      {item.movieTitle || 'Phim trực tuyến'}
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Đã xem {progress}%
                      {item.lastWatchedAt
                        ? ` · Lần cuối ${formatLastWatched(item.lastWatchedAt)}`
                        : ''}
                    </p>
                  </Link>
                );
              })}
        </div>
      </div>
      )}
    </section>
  );
};

export default WatchedOnlineMovies;
