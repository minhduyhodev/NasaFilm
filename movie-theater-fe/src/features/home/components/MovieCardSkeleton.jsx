import './MovieCard.css';

const MovieCardSkeleton = () => (
  <div className="movie-card animate-pulse" aria-hidden="true">
    <div className="movie-card__poster-wrap bg-white/5">
      <div className="h-full w-full bg-white/5" />
    </div>
    <div className="movie-card__body">
      <div className="h-4 w-4/5 rounded bg-white/10" />
      <div className="h-3 w-full rounded bg-white/10" />
      <div className="h-3 w-2/3 rounded bg-white/10" />
      <div className="mt-auto h-9 w-full rounded bg-white/10" />
    </div>
  </div>
);

export default MovieCardSkeleton;
