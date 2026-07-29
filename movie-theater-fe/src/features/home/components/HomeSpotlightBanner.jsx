import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star } from 'lucide-react';
import { useNowShowingMovies, usePublicShowtimes } from '../hooks/useHomeQueries';
import {
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

function pickSpotlightMovie(movies = []) {
  if (!movies.length) return null;

  const ranked = [...movies].sort((a, b) => {
    const scoreA = (a.reviewAverageRating || 0) * Math.log10((a.reviewCount || 0) + 1);
    const scoreB = (b.reviewAverageRating || 0) * Math.log10((b.reviewCount || 0) + 1);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.reviewAverageRating || 0) - (a.reviewAverageRating || 0);
  });

  return ranked[0];
}

export default function HomeSpotlightBanner() {
  const { data, isLoading } = useNowShowingMovies();
  const { data: showtimesData } = usePublicShowtimes({ enabled: true });

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

  if (isLoading) {
    return <div id="home-spotlight" className="home-spotlight home-spotlight--loading" aria-hidden />;
  }

  if (!movie) return null;

  const detailPath = getMovieDetailPath(movie);
  const bookingPath = `${detailPath}#select-showtimes`;
  const metaParts = [
    movie.genres?.slice(0, 2).join(' · '),
    movie.durationMinutes ? `${movie.durationMinutes} phút` : '',
  ].filter(Boolean);

  return (
    <section id="home-spotlight" className="home-spotlight" aria-label={`Phim nổi bật: ${movie.title}`}>
      <div className="home-spotlight__glow" aria-hidden />
      <div className="home-spotlight__inner">
        <Link to={detailPath} className="home-spotlight__poster-link">
          <PosterImage
            src={pickPosterMediaUrl(movie)}
            alt={movie.title}
            width={400}
            className="home-spotlight__poster"
            loading="lazy"
          />
        </Link>

        <div className="home-spotlight__content">
          <p className="home-spotlight__eyebrow">Phim nổi bật tuần này</p>
          <h2 className="home-spotlight__title">
            <Link to={detailPath}>{movie.title}</Link>
          </h2>

          <div className="home-spotlight__meta">
            {metaParts.length > 0 ? <span>{metaParts.join(' · ')}</span> : null}
            {movie.reviewAverageRating > 0 && movie.reviewCount > 0 ? (
              <span className="home-spotlight__rating">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                {movie.reviewAverageRating.toFixed(1)}
                <span className="text-white/45">({movie.reviewCount})</span>
              </span>
            ) : null}
            {showtimeLine ? (
              <span className="home-spotlight__showtime">
                <Clock className="h-3.5 w-3.5 text-red-500" aria-hidden />
                {showtimeLine}
              </span>
            ) : null}
          </div>

          {(movie.description || movie.summary) && (
            <p className="home-spotlight__desc">{movie.description || movie.summary}</p>
          )}

          <div className="home-spotlight__actions">
            <Link to={bookingPath} className="home-spotlight__btn home-spotlight__btn--primary">
              Đặt vé ngay
            </Link>
            <Link to={detailPath} className="home-spotlight__btn home-spotlight__btn--ghost">
              Chi tiết phim
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
