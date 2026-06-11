import React from 'react';

const MovieCardSkeleton = () => {
  return (
    <div className="relative block w-full h-full aspect-[2/3] overflow-hidden rounded-2xl border border-white/5 bg-[#0f121d]/80 shadow-2xl animate-pulse">
      {/* Poster placeholder */}
      <div className="h-full w-full bg-white/5" />

      {/* Dark overlay mirroring movie card layout */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

      {/* Info placeholder */}
      <div className="absolute inset-x-0 bottom-0 p-4 z-20 flex flex-col space-y-3">
        {/* Badges placeholder */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 rounded bg-white/10" />
          <div className="h-3.5 w-10 rounded bg-white/10" />
        </div>

        {/* Title placeholder */}
        <div className="h-5 w-3/4 rounded bg-white/10" />

        {/* Subtitle placeholder */}
        <div className="h-3.5 w-1/2 rounded bg-white/10" />
      </div>
    </div>
  );
};

export default MovieCardSkeleton;
