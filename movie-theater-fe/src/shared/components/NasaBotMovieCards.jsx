import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const MovieCardButton = ({ movie, onSelect, interactive = true, onPauseChange }) => (
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
  >
    <span className="nasa-bot-movie-card__poster">
      {movie.posterUrl ? (
        <PosterImage
          src={movie.posterUrl}
          alt={interactive ? movie.title : ''}
          width={160}
          className="nasa-bot-movie-card__img"
        />
      ) : (
        <span className="nasa-bot-movie-card__fallback" aria-hidden />
      )}
    </span>
    <span className="nasa-bot-movie-card__title">{movie.title}</span>
    <span className="nasa-bot-movie-card__cta">Xem chi tiết</span>
  </button>
);

/**
 * Compact clickable movie posters under NASA BOT Giải đáp replies.
 * Always auto-pans left/right (JS) so it works even when OS reduces motion.
 */
const NasaBotMovieCards = ({ movies = null, text = '', onSelect }) => {
  const seeded = useMemo(() => normalizeMovieCards(movies), [movies]);
  const uuidsFromText = useMemo(() => extractMovieUuidsFromText(text), [text]);
  const [cards, setCards] = useState(seeded);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    setCards(seeded);
  }, [seeded]);

  useEffect(() => {
    if (seeded.length > 0) return undefined;
    if (uuidsFromText.length === 0) return undefined;

    let cancelled = false;
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
      } catch {
        if (!cancelled) setCards([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seeded.length, uuidsFromText]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || cards.length < 2) return undefined;

    let offset = 0;
    let direction = -1;
    let maxTravel = 0;
    let rafId = 0;
    let lastTs = 0;
    let edgeWait = 0;

    const measure = () => {
      // Half track = one copy of the cards (we render the list twice).
      maxTravel = Math.max(track.scrollWidth / 2, 160);
    };

    measure();
    const timers = [80, 250, 600, 1200].map((ms) => window.setTimeout(measure, ms));
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;
    ro?.observe(track);
    ro?.observe(viewport);

    const tick = (ts) => {
      const prev = lastTs || ts;
      const dt = Math.min(50, ts - prev);
      lastTs = ts;

      if (!pausedRef.current && maxTravel > 8) {
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
    };
  }, [cards]);

  if (!cards.length) return null;

  const marquee = cards.length >= 2;

  return (
    <div
      ref={viewportRef}
      className={`nasa-bot-movies${marquee ? ' nasa-bot-movies--marquee' : ''}`}
      aria-label="Phim đề xuất"
    >
      <div ref={trackRef} className="nasa-bot-movies__track" role="list">
        {cards.map((movie) => (
          <MovieCardButton
            key={movie.uuid}
            movie={movie}
            onSelect={onSelect}
            interactive
            onPauseChange={(paused) => { pausedRef.current = paused; }}
          />
        ))}
        {marquee
          ? cards.map((movie) => (
            <MovieCardButton
              key={`loop-${movie.uuid}`}
              movie={movie}
              onSelect={onSelect}
              interactive={false}
            />
          ))
          : null}
      </div>
    </div>
  );
};

export default NasaBotMovieCards;
