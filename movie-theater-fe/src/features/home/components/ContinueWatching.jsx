import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { vodService } from '../../../shared/services/vodService';
import { VOD_PLAYBACK_STATE } from '../../../shared/constants/vod';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { mapApiMovies, isOnlineBooking, pickPosterMediaUrl, getOnlineMoviePath } from '../utils/movieUtils';
import PosterImage from '../../../shared/components/PosterImage';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';

const formatMeta = (movie, watched) => {
  const parts = [];
  if (movie.genres?.[0]) parts.push(movie.genres[0]);
  const duration = movie.durationMinutes
    || (movie.vodStatus?.durationSeconds
      ? Math.round(movie.vodStatus.durationSeconds / 60)
      : null);
  if (duration) parts.push(`${watched}/${duration} phút`);
  else parts.push(`${watched} phút đã xem`);
  return parts.join(' · ');
};

const calcWatchProgress = (firstPlayedAt, expiresAt, durationMinutes) => {
  if (!firstPlayedAt) return { progress: 0, watched: 0 };

  const duration = durationMinutes || 120;
  const startMs = new Date(firstPlayedAt).getTime();
  const endMs = expiresAt ? new Date(expiresAt).getTime() : startMs + duration * 60000;
  const totalWindow = Math.max(1, (endMs - startMs) / 60000);
  const elapsedMins = Math.max(0, (Date.now() - startMs) / 60000);
  const watched = Math.min(Math.round(elapsedMins), duration);
  const progress = Math.min(100, Math.round((elapsedMins / totalWindow) * 100));

  return { progress, watched };
};

const ContinueWatching = ({ onlineOnly = false, getOnlinePath: getOnlinePathProp }) => {
  const scrollerRef = useRef(null);
  const { isAuthenticated } = useAuthContext();
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const routeMovieIds = useMemo(() => movies.map((m) => m.uuid), [movies]);
  const { getOnlinePath: getOnlinePathLocal } = useOnlineVodRoutes(routeMovieIds);
  const resolveOnlinePath = getOnlinePathProp || getOnlinePathLocal;

  useEffect(() => {
    const fetchContinueWatching = async () => {
      setIsLoading(true);
      try {
        if (!onlineOnly || !isAuthenticated) {
          setMovies([]);
          return;
        }

        const bookings = await vodService.getMyBookings();
        const onlineBookings = (bookings || []).filter(
          (booking) => isOnlineBooking(booking) && booking.movieUuid
        );

        const uniqueMovieIds = [...new Set(onlineBookings.map((b) => b.movieUuid))];

        const [statusBatch, summaries] = await Promise.all([
          vodService.getStatusBatch(uniqueMovieIds),
          movieService.getMovieSummaries(uniqueMovieIds),
        ]);
        const summaryByUuid = new Map((summaries || []).map((s) => [s.uuid, s]));

        const watching = uniqueMovieIds
          .map((movieUuid) => {
            const status = statusBatch?.[movieUuid];
            const summary = summaryByUuid.get(movieUuid);
            if (
              !status?.hasPurchased ||
              status?.playbackState !== VOD_PLAYBACK_STATE.STREAMING ||
              !status?.firstPlayedAt ||
              !summary
            ) {
              return null;
            }

            const mapped = mapApiMovies([{
              uuid: summary.uuid,
              title: summary.title,
              ageRestriction: summary.ageRestriction,
              primaryMediaUrl: summary.primaryMediaUrl,
            }])[0];
            const { progress, watched } = status.positionSeconds > 0
              ? {
                  progress: status.progressPercent || Math.min(
                    100,
                    Math.round((status.positionSeconds / (status.durationSeconds || mapped.durationMinutes * 60 || 1)) * 100),
                  ),
                  watched: Math.round(status.positionSeconds / 60),
                }
              : calcWatchProgress(
                  status.firstPlayedAt,
                  status.expiresAt,
                  mapped.durationMinutes,
                );

            return { ...mapped, progress, watched, vodStatus: status };
          })
          .filter(Boolean);

        setMovies(watching.slice(0, 8));
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContinueWatching();
  }, [onlineOnly, isAuthenticated]);

  const scroll = (dir) => {
    scrollerRef.current?.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
  };

  if (!isLoading && movies.length === 0) return null;

  return (
    <section>
      <div className="section-heading-row">
        <h2 className="section-heading">Tiếp tục xem</h2>
      </div>

      <div className="relative">
        <button type="button" onClick={() => scroll('left')} className="hidden md:flex absolute -left-3 top-[38%] -translate-y-1/2 z-10 h-9 w-9 items-center justify-center text-white/50 hover:text-white transition-colors" aria-label="Trước">
          <ChevronLeft size={28} />
        </button>
        <button type="button" onClick={() => scroll('right')} className="hidden md:flex absolute -right-3 top-[38%] -translate-y-1/2 z-10 h-9 w-9 items-center justify-center text-white/50 hover:text-white transition-colors" aria-label="Sau">
          <ChevronRight size={28} />
        </button>

        <div ref={scrollerRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex-none w-[72%] sm:w-[45%] md:w-[calc(25%-12px)]">
                  <div className="aspect-[16/9] rounded bg-white/5 animate-pulse" />
                </div>
              ))
            : movies.map((movie) => (
                <Link
                  key={movie.uuid}
                  to={resolveOnlinePath(movie.uuid) || getOnlineMoviePath(movie.uuid, movie.vodStatus)}
                  className="flex-none w-[72%] sm:w-[45%] md:w-[calc(25%-12px)] group"
                >
                  <div className="relative aspect-[16/9] overflow-hidden rounded border border-white/5">
                    <PosterImage
                      src={pickPosterMediaUrl(movie)}
                      alt={movie.title}
                      width={480}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                      <div className="h-full bg-red-600" style={{ width: `${movie.progress}%` }} />
                    </div>
                  </div>
                  <h3 className="mt-2.5 text-xs font-bold text-white uppercase tracking-wide line-clamp-1 group-hover:text-red-400 transition-colors">
                    {movie.title}
                  </h3>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {formatMeta(movie, movie.watched)}
                  </p>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
};

export default ContinueWatching;
