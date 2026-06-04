import React from 'react';
import { Star } from 'lucide-react';

const MovieCard = ({ title, genre, rating, poster, duration, format }) => {
  // Format badge color mappings matching mockup styles
  const getFormatBadgeStyle = (fmt) => {
    const f = fmt?.toUpperCase() || '';
    if (f === 'IMAX') return 'bg-[#dc2626]/85 text-white';
    if (f === 'PREMIER') return 'bg-[#f3a092] text-neutral-900';
    if (f === 'DOLBY') return 'bg-white/10 text-white border border-white/10';
    if (f === '4DX') return 'bg-neutral-800/80 text-white border border-neutral-700/20';
    return 'bg-white/10 text-white';
  };

  return (
    <div className="group relative w-full aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-[#0f121d] shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-red-500/5">
      {/* Poster Image */}
      <img
        src={poster}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent z-10" />

      {/* Movie Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 z-20 flex flex-col justify-end space-y-2">
        {/* Badges: Format & Rating */}
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getFormatBadgeStyle(format)}`}>
            {format || '2D'}
          </span>
          {rating && (
            <div className="flex items-center gap-1 text-[11px] font-black text-gray-200">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wide leading-tight group-hover:text-red-300 transition-colors duration-200">
          {title}
        </h3>

        {/* Subtitle: Genre & Duration */}
        <p className="text-xs text-gray-400 font-medium truncate">
          {genre} {duration && `• ${duration}`}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
