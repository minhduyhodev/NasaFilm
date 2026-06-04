import React from 'react';
import { Star, Tag, Clock, Globe, MessageSquare } from 'lucide-react';

interface MovieCardProps {
  title: string;
  genre?: string;
  rating: number;
  poster: string;
  hoverDetails?: {
    fullTitle?: string;
    genre?: string;
    duration?: string;
    country?: string;
    language?: string;
  };
}

const MovieCard: React.FC<MovieCardProps> = ({ title, genre, rating, poster, hoverDetails }) => {
  return (
    <div className="group w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#141826] shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-[1.04] hover:-translate-y-1">
      <div className="relative w-full pb-[150%] overflow-hidden bg-black/40">
        <img src={poster} alt={title} className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-105" />

        {/* removed 2D badge per request */}

        {/* Hover details overlay */}
        {hoverDetails && (
          <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center px-5 py-4 text-white z-20">
            <h4 className="text-sm font-black text-center mb-6 leading-normal tracking-wide text-white uppercase">
              {hoverDetails.fullTitle || title}
            </h4>
            
            <div className="space-y-4 text-xs md:text-sm text-gray-200 px-2">
              {hoverDetails.genre && (
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <span className="font-semibold">{hoverDetails.genre}</span>
                </div>
              )}
              {hoverDetails.duration && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <span className="font-semibold">{hoverDetails.duration}</span>
                </div>
              )}
              {hoverDetails.country && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <span className="font-semibold">{hoverDetails.country}</span>
                </div>
              )}
              {hoverDetails.language && (
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <span className="font-semibold">{hoverDetails.language}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 h-20 flex flex-col justify-center">
        <h3 className="text-sm md:text-base font-black text-white text-center uppercase leading-snug line-clamp-2">
          {title}
        </h3>
        {genre && <p className="text-xs md:text-sm text-white/55 text-center mt-1 truncate">{genre}</p>}
      </div>
    </div>
  );
};

export default MovieCard;
