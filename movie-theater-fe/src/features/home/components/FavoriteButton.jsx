import React from 'react';
import { Heart } from 'lucide-react';
import { useMovieFavorite } from '../hooks/useMovieFavorite';

const FavoriteButton = ({ movieUuid, className = '' }) => {
  const { isFavorite, isLoading, toggleFavorite } = useMovieFavorite(movieUuid);

  if (!movieUuid) return null;

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
        isFavorite
          ? 'border-red-500/50 bg-red-500/15 text-red-400'
          : 'border-white/10 bg-white/5 text-gray-300 hover:border-red-500/30 hover:text-red-400'
      } ${className}`}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Bỏ lưu phim' : 'Lưu phim'}
    >
      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
      <span className="text-xs font-bold uppercase tracking-wide">
        {isFavorite ? 'Đã lưu' : 'Lưu phim'}
      </span>
    </button>
  );
};

export default FavoriteButton;
