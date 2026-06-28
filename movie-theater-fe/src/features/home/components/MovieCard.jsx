import React from 'react';
import { Tag, Clock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMovieDetailPath, getOnlineMoviePath, pickPosterMediaUrl } from '../utils/movieUtils';
import PosterImage from '../../../shared/components/PosterImage';

const MovieCard = ({ uuid, title, genre, genres, poster, primaryMediaUrl, duration, durationMinutes, format, hoverDetails, ageRestriction, actionLabel = 'Mua vé', fromOnline = false, getOnlinePath, vodStatus }) => {
  const formatDuration = (mins) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
  };

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const resolveOnlinePath = (movieUuid) => {
    if (getOnlinePath) return getOnlinePath(movieUuid);
    return getOnlineMoviePath(movieUuid, vodStatus);
  };
  const linkTarget =
    fromOnline && uuid
      ? resolveOnlinePath(uuid)
      : getMovieDetailPath(uuid || slug, { online: false });
  const watchTarget = linkTarget;
  const displayGenre = genres && genres.length > 0 ? genres.join(' / ') : genre;
  const displayDuration = durationMinutes ? formatDuration(durationMinutes) : duration;

  // Format badge color mappings matching mockup styles
  const getFormatBadgeStyle = (fmt) => {
    const f = fmt?.toUpperCase() || '';
    if (f.includes('IMAX')) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500';
    if (f.includes('4DX')) return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500';
    if (f.includes('DOLBY')) return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500';
    return 'bg-red-500/10 border-red-500/30 text-red-500';
  };

  return (
    <div className="group flex flex-col w-full h-full transition-all duration-300">
      {/* Clickable Poster Frame */}
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-[20px] transition-transform duration-500 group-hover:scale-[1.02] shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
        <Link to={linkTarget} className="block w-full h-full">
          <PosterImage
            src={pickPosterMediaUrl({ uuid, primaryMediaUrl, poster })}
            alt={title}
            width={400}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>

        {/* Rating and Format Badges on Poster (floating, clean) */}
        <div className="absolute top-4 left-4 z-10 flex gap-1.5">
          {format && !format.toUpperCase().includes('2D') && (
            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/10`}>
              {format}
            </span>
          )}
          {ageRestriction && (
            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
              ageRestriction.toUpperCase() === 'P' ? 'bg-emerald-600/90 text-white' : 
              ageRestriction.toUpperCase().includes('T18') ? 'bg-red-600/90 text-white' : 
              'bg-amber-600/90 text-white'
            }`}>
              {ageRestriction}
            </span>
          )}
        </div>

        {/* Hover Details Overlay on Poster */}
        {hoverDetails && (
          <Link to={linkTarget} className="absolute inset-0 bg-black/90 backdrop-blur-[6px] z-30 flex flex-col justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h4 className="text-base font-black text-white uppercase tracking-wide mb-4 font-heading border-b border-white/10 pb-2">
              {hoverDetails.fullTitle || title}
            </h4>
            <div className="flex flex-col gap-3">
              {hoverDetails.genre && (
                <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-300">
                  <Tag className="h-4 w-4 text-red-500" />
                  <span>{hoverDetails.genre}</span>
                </div>
              )}
              {hoverDetails.duration && (
                <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-300">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span>{hoverDetails.duration}</span>
                </div>
              )}
              {hoverDetails.country && (
                <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-300">
                  <Globe className="h-4 w-4 text-red-500" />
                  <span>{hoverDetails.country}</span>
                </div>
              )}

            </div>
          </Link>
        )}
      </div>

      {/* Info details under poster */}
      <div className="mt-4 flex flex-col space-y-1 text-left px-1">
        <Link to={linkTarget}>
          <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-wide leading-tight group-hover:text-red-500 transition-colors duration-200 font-heading line-clamp-1">
            {title}
          </h3>
        </Link>
        
        <p className="text-xs text-gray-400 font-medium truncate">
          {displayGenre} {displayDuration && ` · ${displayDuration}`}
        </p>

        {/* Clean Editorial Link */}
        <div className="pt-2">
          <Link to={watchTarget} className="inline-block text-xs font-extrabold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors duration-200 border-b border-transparent hover:border-red-400">
            [{actionLabel}]
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
