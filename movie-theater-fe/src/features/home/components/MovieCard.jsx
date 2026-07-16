import React from 'react';
import { Clock, Globe, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMovieDetailPath, getOnlineMoviePath, pickPosterMediaUrl, formatAgeRestrictionBadge, resolveAgeRestrictionClass } from '../utils/movieUtils';
import PosterImage from '../../../shared/components/PosterImage';
import FavoriteIconButton from './FavoriteIconButton';
import './MovieCard.css';

const formatDurationShort = (mins) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ`;
  return `${m}'`;
};

const resolveStatusBadge = ({ releaseDate, reviewAverageRating, reviewCount }) => {
  if (releaseDate) {
    const releasedAt = new Date(releaseDate).getTime();
    if (!Number.isNaN(releasedAt)) {
      const daysSinceRelease = (Date.now() - releasedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceRelease >= 0 && daysSinceRelease <= 21) {
        return { label: 'MỚI', type: 'new' };
      }
    }
  }
  if (reviewAverageRating >= 4.5 && reviewCount >= 1) {
    return { label: 'HOT', type: 'hot' };
  }
  return null;
};

const MovieCard = ({
  uuid,
  slug: slugProp,
  title,
  genre,
  genres,
  poster,
  primaryMediaUrl,
  duration,
  durationMinutes,
  ageRestriction,
  actionLabel = 'Mua vé',
  fromOnline = false,
  getOnlinePath,
  vodStatus,
  reviewAverageRating,
  reviewCount,
  releaseDate,
  bestOnBigScreen = false,
  countries,
  hoverDetails,
  posterLoading = 'lazy',
}) => {
  const pathId = slugProp || uuid
    || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const resolveOnlinePath = (movieRef) => {
    if (getOnlinePath) return getOnlinePath(movieRef);
    return getOnlineMoviePath(movieRef, vodStatus);
  };
  const linkTarget =
    fromOnline && pathId
      ? resolveOnlinePath(pathId)
      : getMovieDetailPath(pathId, { online: false });

  const displayGenres = genres?.length
    ? genres.join(', ')
    : genre;
  const displayDuration = durationMinutes
    ? formatDurationShort(durationMinutes)
    : duration;
  const displayCountry = countries?.length
    ? countries.join(', ')
    : hoverDetails?.country;
  const hasReviewScore = reviewAverageRating > 0 && reviewCount > 0;
  const statusBadge = resolveStatusBadge({ releaseDate, reviewAverageRating, reviewCount });

  return (
    <article className="movie-card group">
      <div className="movie-card__poster-wrap">
        <Link to={linkTarget} className="movie-card__poster-link" aria-label={title}>
          <PosterImage
            src={pickPosterMediaUrl({ uuid, primaryMediaUrl, poster })}
            alt={title}
            width={400}
            className="movie-card__poster"
            loading={posterLoading}
          />
        </Link>

        <div className="movie-card__badges-left">
          {bestOnBigScreen && (
            <span className="movie-card__status movie-card__status--bigscreen" title="Khán giả NASA khuyên xem rạp">
              BIG SCREEN
            </span>
          )}
          {statusBadge && (
            <span className={`movie-card__status movie-card__status--${statusBadge.type}`}>
              {statusBadge.label}
            </span>
          )}
          {hasReviewScore && (
            <span className="movie-card__rating">
              <Star className="movie-card__rating-icon" aria-hidden="true" />
              {Number(reviewAverageRating).toFixed(1)}
            </span>
          )}
        </div>

        {uuid && (
          <div className="movie-card__favorite">
            <FavoriteIconButton movieUuid={uuid} />
          </div>
        )}

        {ageRestriction && (
          <span
            className={resolveAgeRestrictionClass(ageRestriction)}
            title={ageRestriction}
          >
            {formatAgeRestrictionBadge(ageRestriction)}
          </span>
        )}
      </div>

      <div className="movie-card__body">
        <Link to={linkTarget}>
          <h3 className="movie-card__title">{title}</h3>
        </Link>

        {displayGenres && (
          <p className="movie-card__genres">{displayGenres}</p>
        )}

        {(displayDuration || displayCountry) && (
          <div className="movie-card__meta">
            {displayDuration && (
              <span className="movie-card__meta-item">
                <Clock className="movie-card__meta-icon" aria-hidden="true" />
                {displayDuration}
              </span>
            )}
            {displayCountry && (
              <span className="movie-card__meta-item">
                <Globe className="movie-card__meta-icon" aria-hidden="true" />
                {displayCountry}
              </span>
            )}
          </div>
        )}

        <Link to={linkTarget} className="movie-card__cta">
          {actionLabel}
        </Link>
      </div>
    </article>
  );
};

export default MovieCard;
