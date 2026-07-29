import { useLayoutEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Film } from 'lucide-react';
import { useNowShowingMovies, usePublicShowtimes } from '../hooks/useHomeQueries';
import {
  formatAgeRestrictionBadge,
  getMovieDetailPath,
  mapApiMovies,
  pickPosterMediaUrl,
} from '../utils/movieUtils';
import {
  buildEarliestShowtimeByMovie,
  formatEarliestShowtimeLabel,
  resolveMovieEarliestShowtime,
} from '../utils/homeQuickBookUtils';
import PosterImage from '../../../shared/components/PosterImage';
import './HomeSpotlightBanner.css';

const POSTER_W = 260;
const POSTER_H = 390;

function pickSpotlightMovie(movies = []) {
  if (!movies.length) return null;
  return [...movies].sort((a, b) => {
    const scoreA = (a.reviewAverageRating || 0) * Math.log10((a.reviewCount || 0) + 1);
    const scoreB = (b.reviewAverageRating || 0) * Math.log10((b.reviewCount || 0) + 1);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.reviewAverageRating || 0) - (a.reviewAverageRating || 0);
  })[0];
}

function formatDuration(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  const h = Math.floor(value / 60);
  const m = Math.round(value % 60);
  if (h <= 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

function formatRelease(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export default function HomeSpotlightBanner() {
  const { data, isLoading } = useNowShowingMovies();
  const { data: showtimesData } = usePublicShowtimes({ enabled: true });
  const posterRef = useRef(null);
  const panelRef = useRef(null);

  const moviesList = useMemo(() => {
    if (!data?.content?.length) return [];
    return mapApiMovies(data.content);
  }, [data]);

  const movie = useMemo(() => pickSpotlightMovie(moviesList), [moviesList]);

  const showtimeMap = useMemo(
    () => buildEarliestShowtimeByMovie(showtimesData || []),
    [showtimesData],
  );

  const earliest = movie ? resolveMovieEarliestShowtime(movie, showtimeMap) : null;
  const showtimeLine = formatEarliestShowtimeLabel(
    earliest?.startTime || movie?.nextShowtimeStart,
  );

  useLayoutEffect(() => {
    const posterEl = posterRef.current;
    const panelEl = panelRef.current;
    if (!posterEl || !panelEl) return undefined;

    const sync = () => {
      const h = Math.round(posterEl.getBoundingClientRect().height);
      if (h < 80) return;
      panelEl.style.height = `${h}px`;
      panelEl.style.minHeight = `${h}px`;
      panelEl.style.maxHeight = `${h}px`;
    };

    sync();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(posterEl);
    window.addEventListener('resize', sync);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [movie?.uuid, movie?.title]);

  if (isLoading) {
    return <div id="home-spotlight" className="home-spotlight home-spotlight--loading" aria-hidden />;
  }

  if (!movie) return null;

  const detailPath = getMovieDetailPath(movie);
  const bookingPath = `${detailPath}#select-showtimes`;
  const posterUrl = pickPosterMediaUrl(movie);
  const meta = [
    ...(movie.genres?.slice(0, 3) || []),
    formatDuration(movie.durationMinutes),
    formatAgeRestrictionBadge(movie.ageRestriction),
  ].filter(Boolean);
  const dateLine = showtimeLine || formatRelease(movie.releaseDate);
  const synopsis = movie.description || movie.summary || '';

  return (
    <section
      id="home-spotlight"
      className="home-spotlight"
      aria-label={`Phim nổi bật: ${movie.title}`}
    >
      <header className="home-spotlight__head">
        <div className="home-spotlight__title-block">
          <p className="home-spotlight__eyebrow">NASAFilm chọn lọc</p>
          <h2 className="home-spotlight__heading">Phim nổi bật</h2>
          <p className="home-spotlight__subtitle">Phim được đề xuất dựa trên đánh giá của khán giả</p>
          <div className="home-spotlight__underline" aria-hidden />
        </div>
      </header>

      <div className="home-spotlight__row">
        <Link
          ref={posterRef}
          to={detailPath}
          className="home-spotlight__poster"
          style={{ width: POSTER_W, height: POSTER_H }}
          aria-label={`Xem chi tiết ${movie.title}`}
        >
          {posterUrl ? (
            <PosterImage
              src={posterUrl}
              alt={movie.title}
              width={480}
              className="home-spotlight__poster-img"
              loading="lazy"
            />
          ) : null}
        </Link>

        <div ref={panelRef} className="home-spotlight__copy">
          <p className="home-spotlight__tag">Đang chiếu · được đề xuất</p>
          <h3 className="home-spotlight__title">
            <Link to={detailPath}>{movie.title}</Link>
          </h3>

          <p className="home-spotlight__meta">
            {meta.length
              ? meta.map((part, i) => (
                <span key={`${part}-${i}`}>
                  {i > 0 ? <span className="home-spotlight__dot" aria-hidden>·</span> : null}
                  {part}
                </span>
              ))
              : '\u00A0'}
          </p>

          <p className="home-spotlight__when">
            {dateLine ? (
              <>
                <Clock aria-hidden />
                <span>{dateLine}</span>
              </>
            ) : (
              <span aria-hidden>&nbsp;</span>
            )}
          </p>

          <p className="home-spotlight__desc">{synopsis || '\u00A0'}</p>

          <div className="home-spotlight__cta">
            <Link to={bookingPath} className="home-spotlight__btn home-spotlight__btn--primary">
              Đặt vé ngay
              <ArrowRight aria-hidden />
            </Link>
            <Link to={detailPath} className="home-spotlight__btn home-spotlight__btn--ghost">
              <Film aria-hidden />
              Chi tiết
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
