import { useMemo } from "react";
import { Clock, Star } from "lucide-react";
import { motion } from "framer-motion";
import { formatAgeRestrictionBadge } from "../utils/movieUtils";
import "./HeroMovieDetailPanel.css";

const formatDuration = (mins) => {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ`;
  return `${m} phút`;
};

/** Slot poster + thông số — poster thật do DomeGallery animate vào slot */
export default function HeroMovieDetailPanel({ item }) {
  const movie = item?.movie || null;
  const title = movie?.title || item?.alt || "";

  const metaLine = useMemo(() => {
    const parts = [];
    if (movie?.genres?.length) parts.push(movie.genres.join(" • "));
    if (movie?.durationMinutes) parts.push(formatDuration(movie.durationMinutes));
    const age = formatAgeRestrictionBadge(movie?.ageRestriction);
    if (age) parts.push(age);
    return parts.join(" • ");
  }, [movie]);

  if (!title) return null;

  return (
    <motion.aside
      className="hero-movie-detail"
      aria-label={title}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="hero-movie-detail__group">
        <div className="hero-movie-detail__poster-slot" aria-hidden />

        <motion.div
          className="hero-movie-detail__info"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.4, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
        <p className="hero-movie-detail__eyebrow">PHIM ĐƯỢC CHỌN</p>
        <h2 className="hero-movie-detail__title">{title}</h2>

        {metaLine ? <p className="hero-movie-detail__meta">{metaLine}</p> : null}

        {movie?.reviewAverageRating > 0 && movie?.reviewCount > 0 ? (
          <div className="hero-movie-detail__rating">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" aria-hidden />
            <span className="hero-movie-detail__rating-value">
              {movie.reviewAverageRating.toFixed(1)}
            </span>
            <span className="hero-movie-detail__rating-count">
              ({movie.reviewCount} đánh giá)
            </span>
          </div>
        ) : null}

        {movie?.releaseDate ? (
          <p className="hero-movie-detail__release">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {new Date(movie.releaseDate).toLocaleDateString("vi-VN")}
          </p>
        ) : null}

        {(movie?.description || movie?.summary) && (
          <p className="hero-movie-detail__desc">
            {movie.description || movie.summary}
          </p>
        )}
        </motion.div>
      </div>
    </motion.aside>
  );
}
