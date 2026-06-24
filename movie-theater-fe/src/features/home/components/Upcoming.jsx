import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X, Bell, BellRing } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { comboService } from '../../../shared/services/comboService';
import { notificationService } from '../../../shared/services/notificationService';
import tokenService from '../../../features/auth/utils/tokenService';
import PosterImage from '../../../shared/components/PosterImage';

const REMINDER_STORAGE_KEY = 'nasa_movie_reminders';

const getEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return url;
};

const getTrailerUrl = (detail) => {
  if (!detail?.medias?.length) return null;
  return detail.medias.find(m => m.mediaType === 'TRAILER')?.mediaUrl || null;
};

const loadReminders = () => {
  try {
    const userId = tokenService.getUser()?.id || 'guest';
    const raw = localStorage.getItem(`${REMINDER_STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveReminders = (ids) => {
  const userId = tokenService.getUser()?.id || 'guest';
  localStorage.setItem(`${REMINDER_STORAGE_KEY}_${userId}`, JSON.stringify(ids));
};

const formatShowtimeLabel = (isoString) => {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Upcoming = () => {
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [movieDetail, setMovieDetail] = useState(null);
  const [familyCombo, setFamilyCombo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [reminders, setReminders] = useState(loadReminders);

  const upcomingMovie = upcomingMovies[currentIndex] || null;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [moviesData, combos] = await Promise.all([
          movieService.getUpcomingMovies({ page: 0, size: 10 }),
          comboService.getActiveCombos().catch(() => []),
        ]);

        if (moviesData?.content?.length > 0) {
          setUpcomingMovies(moviesData.content);
          setCurrentIndex(0);
        } else {
          setUpcomingMovies([]);
        }

        const family = (combos || []).find(c =>
          c.name?.toLowerCase().includes('gia đình') || c.name?.toLowerCase().includes('gia dinh')
        );
        setFamilyCombo(family || combos?.[0] || null);
      } catch (err) {
        console.error('Failed to fetch upcoming spotlight:', err);
        setUpcomingMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!upcomingMovie?.uuid) {
      setMovieDetail(null);
      return;
    }

    let cancelled = false;
    movieService.getMovieDetail(upcomingMovie.uuid)
      .then(detail => {
        if (!cancelled) setMovieDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setMovieDetail(null);
      });

    return () => { cancelled = true; };
  }, [upcomingMovie?.uuid]);

  const targetDate = useMemo(() => {
    if (upcomingMovie?.nextShowtimeStart) {
      const d = new Date(upcomingMovie.nextShowtimeStart);
      if (!isNaN(d.getTime())) return d;
    }
    if (upcomingMovie?.releaseDate) {
      const d = new Date(upcomingMovie.releaseDate);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }, [upcomingMovie]);

  const [diff, setDiff] = useState(0);

  useEffect(() => {
    if (!targetDate) {
      setDiff(0);
      return;
    }
    setDiff(targetDate.getTime() - Date.now());
    const timerId = window.setInterval(() => {
      setDiff(targetDate.getTime() - Date.now());
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [targetDate]);

  const formatCountdown = (milliseconds) => {
    if (milliseconds <= 0) return 'Sắp công chiếu';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${String(days).padStart(2, '0')} ngày ${String(hours).padStart(2, '0')} giờ`;
    }
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút`;
    }
    return `${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`;
  };

  const trailerUrl = getTrailerUrl(movieDetail);
  const isReminderSet = upcomingMovie?.uuid && reminders.includes(upcomingMovie.uuid);

  const handleReminder = useCallback(() => {
    if (!upcomingMovie?.uuid) return;

    const next = isReminderSet
      ? reminders.filter(id => id !== upcomingMovie.uuid)
      : [...reminders, upcomingMovie.uuid];

    setReminders(next);
    saveReminders(next);

    if (isReminderSet) {
      notificationService.info(`Đã hủy nhắc nhở cho "${upcomingMovie.title}"`);
    } else {
      const when = formatShowtimeLabel(upcomingMovie.nextShowtimeStart)
        || (upcomingMovie.releaseDate ? `ngày ${upcomingMovie.releaseDate}` : 'sắp tới');
      notificationService.success(`Đã đặt nhắc nhở suất chiếu "${upcomingMovie.title}" (${when})`);
      notificationService.addNotification(
        'Nhắc suất chiếu',
        `Bạn sẽ được nhắc khi "${upcomingMovie.title}" mở bán vé hoặc đến giờ chiếu (${when}).`,
        'info'
      );
    }
  }, [upcomingMovie, isReminderSet, reminders]);

  const goPrev = () => {
    setCurrentIndex(i => (i - 1 + upcomingMovies.length) % upcomingMovies.length);
  };

  const goNext = () => {
    setCurrentIndex(i => (i + 1) % upcomingMovies.length);
  };

  if (isLoading || !upcomingMovie) {
    return null;
  }

  const displayPoster = upcomingMovie.primaryMediaUrl || null;
  const showtimeLabel = formatShowtimeLabel(upcomingMovie.nextShowtimeStart);

  return (
    <section className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] items-start text-left">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7 }}
        className="relative group flex flex-col md:flex-row gap-8 items-center md:items-stretch"
      >
        {upcomingMovies.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10"
              aria-label="Phim sắp chiếu trước"
            >
              <ChevronLeft size={36} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10"
              aria-label="Phim sắp chiếu tiếp theo"
            >
              <ChevronRight size={36} />
            </button>
          </>
        )}

        <Link
          to={`/movie/${upcomingMovie.uuid}`}
          className="w-full md:w-3/5 aspect-[16/10] md:aspect-[3/4] overflow-hidden rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative bg-[#111216] block"
        >
          {displayPoster && (
            <PosterImage
              src={displayPoster}
              alt={upcomingMovie.title}
              width={600}
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {showtimeLabel && (
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-3 py-1 rounded-full bg-red-600/90 text-[10px] font-black uppercase tracking-wider text-white">
                Suất sớm nhất: {showtimeLabel}
              </span>
            </div>
          )}
        </Link>

        <div className="w-full md:w-2/5 flex flex-col justify-center space-y-5 md:py-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Phim Sắp Chiếu</span>
            <Link to={`/movie/${upcomingMovie.uuid}`}>
              <h3 className="mt-2 text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight font-heading hover:text-red-400 transition-colors">
                {upcomingMovie.title}
              </h3>
            </Link>
            {upcomingMovie.genres?.length > 0 && (
              <p className="mt-2 text-xs text-gray-400 font-medium">
                {upcomingMovie.genres.join(' · ')}
                {upcomingMovie.durationMinutes ? ` · ${upcomingMovie.durationMinutes} phút` : ''}
              </p>
            )}
          </div>

          {targetDate && (
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 block">
                {upcomingMovie.nextShowtimeStart ? 'Suất chiếu sắp tới' : 'Công chiếu sau'}
              </span>
              <span className="text-3xl md:text-4xl font-black bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent font-heading">
                {formatCountdown(diff)}
              </span>
            </div>
          )}

          {upcomingMovies.length > 1 && (
            <div className="flex items-center gap-2">
              {upcomingMovies.map((m, idx) => (
                <button
                  key={m.uuid}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6 bg-red-500' : 'w-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Xem phim ${m.title}`}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={handleReminder}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                isReminderSet
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_10px_25px_rgba(220,38,38,0.25)]'
              }`}
            >
              {isReminderSet ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {isReminderSet ? 'Đã Nhắc' : 'Nhắc Tôi'}
            </button>
            <button
              type="button"
              onClick={() => setIsTrailerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              Xem Trailer
            </button>
            <Link
              to={`/movie/${upcomingMovie.uuid}`}
              className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-6 py-3 text-xs font-black uppercase tracking-wider text-red-400 transition-all"
            >
              Chi Tiết
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 w-full">
        <Link
          to="/concessions"
          className="p-8 rounded-[28px] bg-[#111216]/40 backdrop-blur-xl border border-white/5 hover:border-red-500/20 transition-all duration-300 block group"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Gói Ưu Đãi</span>
          <h4 className="mt-1.5 text-xl font-black text-white uppercase font-heading group-hover:text-red-400 transition-colors">
            {familyCombo?.name || 'Combo Bắp Nước'}
          </h4>
          {familyCombo?.price != null && (
            <div className="mt-3 text-3xl font-black text-white font-heading">
              {Number(familyCombo.price).toLocaleString('vi-VN')} đ
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-gray-400 font-medium">
            {familyCombo?.description || 'Tiết kiệm hơn khi mua combo trực tuyến cùng vé xem phim.'}
          </p>
          <span className="inline-block mt-4 text-[10px] font-black uppercase tracking-wider text-red-500 group-hover:underline">
            Xem combo →
          </span>
        </Link>

        <Link
          to="/offers"
          className="p-8 rounded-[28px] bg-[#111216]/40 backdrop-blur-xl border border-white/5 hover:border-amber-500/20 transition-all duration-300 block group"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Độc Quyền</span>
          <h4 className="mt-1.5 text-xl font-black text-white uppercase font-heading group-hover:text-amber-400 transition-colors">
            Đêm Công Chiếu
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            Giữ chỗ sớm cho suất chiếu giới hạn với trải nghiệm VIP và quà tặng độc quyền dành riêng cho thành viên.
          </p>
          <span className="inline-block mt-4 text-[10px] font-black uppercase tracking-wider text-amber-500 group-hover:underline">
            Xem ưu đãi →
          </span>
        </Link>
      </div>

      <AnimatePresence>
        {isTrailerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              onClick={() => setIsTrailerOpen(false)}
              aria-hidden
            />
            <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <button
                type="button"
                className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50 bg-black/70 p-2 rounded-full"
                onClick={() => setIsTrailerOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>

              {trailerUrl ? (
                (() => {
                  const embedUrl = getEmbedUrl(trailerUrl);
                  const isYouTube = trailerUrl.includes('youtube.com') || trailerUrl.includes('youtu.be');
                  if (isYouTube) {
                    return (
                      <iframe
                        src={embedUrl}
                        title={`${upcomingMovie.title} Trailer`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return (
                    <video src={trailerUrl} controls autoPlay className="w-full h-full object-contain" />
                  );
                })()
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                  <Play className="text-red-500 h-16 w-16 mb-4 animate-pulse fill-current" />
                  <h2 className="text-2xl font-black text-white uppercase">Chưa có Trailer</h2>
                  <p className="text-gray-400 mt-2 text-sm">Trailer của {upcomingMovie.title} đang được cập nhật.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Upcoming;
