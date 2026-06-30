import React from 'react';
import { Heart } from 'lucide-react';
import { useMovieFavorite } from '../hooks/useMovieFavorite';
import './FavoriteIconButton.css';

const FavoriteIconButton = ({ movieUuid, className = '' }) => {
  const { isFavorite, isLoading, toggleFavorite } = useMovieFavorite(movieUuid, { quiet: true });

  if (!movieUuid) return null;

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`movie-favorite-btn ${isFavorite ? 'is-active' : ''} ${className}`}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
      title={isFavorite ? 'Đã lưu' : 'Lưu phim'}
    >
      <Heart className="movie-favorite-btn__icon" strokeWidth={2.25} />
    </button>
  );
};

export default FavoriteIconButton;
