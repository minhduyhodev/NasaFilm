import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import PosterImage from './PosterImage';
import { movieService } from '../services/movieService';
import { getMovieDetailPath } from '../../features/home/utils/movieUtils';

const MOVIE_PATH_RE = /\/movie\/([0-9a-fA-F-]{36})/g;
const SPEED_PX_PER_SEC = 36;

export const extractMovieUuidsFromText = (text = '') => {
  const uuids = [];
  const seen = new Set();
  const source = String(text || '');
  let match;
  while ((match = MOVIE_PATH_RE.exec(source)) !== null) {
    const uuid = match[1];
    if (seen.has(uuid)) continue;
    seen.add(uuid);
    uuids.push(uuid);
  }
  return uuids;
};

const normalizeMovieCards = (movies = []) => {
  const seen = new Set();
  return (Array.isArray(movies) ? movies : [])
    .map((item) => {
      const uuid = item?.uuid || item?.id || '';
      if (!uuid || seen.has(uuid)) return null;
      seen.add(uuid);
      return {
        uuid,
        title: item?.title || 'Phim',
        posterUrl: item?.posterUrl || item?.primaryMediaUrl || '',
        path: item?.path || getMovieDetailPath(uuid),
      };
    })
    .filter(Boolean);
};

const MovieCardButton = ({ movie, onSelect, interactive = true, onPauseChange, onPosterSettled }) => {
  const settledRef = useRef(false);

  const markSettled = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onPosterSettled?.(movie.uuid);
  }, [movie.uuid, onPosterSettled]);

  useEffect(() => {
    settledRef.current = false;
    if (!movie.posterUrl) {
      markSettled();
    }
  }, [movie.posterUrl, movie.uuid, markSettled]);

  return (
    <button
      type="button"
      role="listitem"
      className="nasa-bot-movie-card"
      title={movie.title}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      onMouseEnter={() => interactive && onPauseChange?.(true)}
      onMouseLeave={() => interactive && onPauseChange?.(false)}
      onFocus={() => interactive && onPauseChange?.(true)}
      onBlur={() => interactive && onPauseChange?.(false)}
      onClick={() => {
        if (!interactive) return;
        onSelect?.(movie.path || getMovieDetailPath(movie.uuid));
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <span className="nasa-bot-movie-card__poster">
        {movie.posterUrl ? (
          <PosterImage
            src={movie.posterUrl}
            alt={interactive ? movie.title : ''}
            width={160}
            className="nasa-bot-movie-card__img"
            loading="eager"
            onLoad={markSettled}
            onError={markSettled}
          />
        ) : (
          <span className="nasa-bot-movie-card__fallback" aria-hidden />
        )}
      </span>
      <span className="nasa-bot-movie-card__title">{movie.title}</span>
      <span className="nasa-bot-movie-card__cta">Xem chi tiết</span>
    </button>
  );
};

/**
 * Compact clickable movie posters under NASA BOT Giải đáp replies.
 * Always auto-pans left/right (JS) so it works even when OS reduces motion.
 */
const NasaBotMovieCards = ({ movies = null, text = '', onSelect }) => {
  const seeded = useMemo(() => normalizeMovieCards(movies), [movies]);
  const uuidsFromText = useMemo(() => extractMovieUuidsFromText(text), [text]);
  const needsFetch = seeded.length === 0 && uuidsFromText.length > 0;

  const [cards, setCards] = useState(seeded);
  const [fetching, setFetching] = useState(needsFetch);
  const [readyIds, setReadyIds] = useState(() => new Set());
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    setCards(seeded);
    setReadyIds(new Set());
    setFetching(seeded.length === 0 && uuidsFromText.length > 0);
  }, [seeded, uuidsFromText.length]);

  useEffect(() => {
    if (seeded.length > 0) return undefined;
    if (uuidsFromText.length === 0) {
      setFetching(false);
      return undefined;
    }

    let cancelled = false;
    setFetching(true);
    (async () => {
      try {
        const summaries = await movieService.getMovieSummaries(uuidsFromText);
        if (cancelled) return;
        const byUuid = new Map(
          (Array.isArray(summaries) ? summaries : []).map((item) => [item.uuid, item]),
        );
        setCards(
          uuidsFromText
            .map((uuid) => {
              const item = byUuid.get(uuid);
              if (!item) return null;
              return {
                uuid,
                title: item.title || 'Phim',
                posterUrl: item.primaryMediaUrl || '',
                path: getMovieDetailPath(uuid),
              };
            })
            .filter(Boolean),
        );
        setReadyIds(new Set());
      } catch {
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seeded.length, uuidsFromText]);

  const handlePosterSettled = useCallback((uuid) => {
    setReadyIds((prev) => {
      if (prev.has(uuid)) return prev;
      const next = new Set(prev);
      next.add(uuid);
      return next;
    });
  }, []);

  const postersReady = cards.length > 0
    && cards.every((movie) => !movie.posterUrl || readyIds.has(movie.uuid));

  const showLoading = fetching || (cards.length > 0 && !postersReady);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || cards.length < 2 || showLoading) return undefined;

    let offset = 0;
    let direction = -1;
    let maxTravel = 0;
    let rafId = 0;
    let lastTs = 0;
    let edgeWait = 0;

    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let hasDragged = false;

    const measure = () => {
      maxTravel = Math.max(0, track.scrollWidth - viewport.clientWidth + 10);
    };

    measure();
    const timers = [80, 250, 600, 1200].map((ms) => window.setTimeout(measure, ms));
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;
    ro?.observe(track);
    ro?.observe(viewport);

    const getClientX = (e) => e.touches ? e.touches[0].clientX : e.clientX;

    const onPointerDown = (e) => {
      isDragging = true;
      hasDragged = false;
      startX = getClientX(e);
      startOffset = offset;
      track.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const x = getClientX(e);
      const dx = x - startX;
      
      if (Math.abs(dx) > 5) {
        hasDragged = true;
      }
      
      if (hasDragged && e.cancelable) {
        e.preventDefault();
      }

      offset = startOffset + dx;
      
      if (offset > 0) offset = 0;
      if (offset < -maxTravel) offset = -maxTravel;
      
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      track.style.cursor = '';
    };

    const onClick = (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    viewport.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    
    viewport.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    
    viewport.addEventListener('click', onClick, true);

    const tick = (ts) => {
      const prev = lastTs || ts;
      const dt = Math.min(50, ts - prev);
      lastTs = ts;

      if (!pausedRef.current && maxTravel > 8 && !isDragging) {
        if (edgeWait > 0) {
          edgeWait -= dt;
        } else {
          offset += direction * SPEED_PX_PER_SEC * (dt / 1000);
          if (offset <= -maxTravel) {
            offset = -maxTravel;
            direction = 1;
            edgeWait = 600;
          } else if (offset >= 0) {
            offset = 0;
            direction = -1;
            edgeWait = 600;
          }
          track.style.transform = `translate3d(${offset}px, 0, 0)`;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
      window.cancelAnimationFrame(rafId);
      
      viewport.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      
      viewport.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      
      viewport.removeEventListener('click', onClick, true);
    };
  }, [cards, showLoading]);

  if (!fetching && !cards.length) return null;

  const marquee = cards.length >= 2;

  return (
    <div
      ref={viewportRef}
      className={`nasa-bot-movies${marquee && !showLoading ? ' nasa-bot-movies--marquee' : ''}${showLoading ? ' nasa-bot-movies--loading' : ''}`}
      aria-label={showLoading ? 'Đang tải phim' : 'Phim đề xuất'}
      aria-busy={showLoading || undefined}
    >
      {showLoading ? (
        <div className="nasa-bot-movies__loading" role="status">
          <span className="nasa-bot-movies__loading-pulse" aria-hidden />
          <span>Đang tải phim…</span>
        </div>
      ) : null}

      <div
        ref={trackRef}
        className={`nasa-bot-movies__track${showLoading ? ' nasa-bot-movies__track--pending' : ''}`}
        role="list"
        aria-hidden={showLoading || undefined}
      >
        {cards.map((movie) => (
          <MovieCardButton
            key={movie.uuid}
            movie={movie}
            onSelect={onSelect}
            interactive={!showLoading}
            onPauseChange={(paused) => { pausedRef.current = paused; }}
            onPosterSettled={handlePosterSettled}
          />
        ))}
      </div>
    </div>
  );
};

export default NasaBotMovieCards;
