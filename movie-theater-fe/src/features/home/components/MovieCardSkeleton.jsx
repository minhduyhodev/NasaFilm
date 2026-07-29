import './MovieCard.css';

const MovieCardSkeleton = ({ showcase = false }) => (
  <div
    className={`movie-card animate-pulse${showcase ? ' movie-card--showcase' : ''}`}
    aria-hidden="true"
  >
    <div className="movie-card__poster-wrap bg-white/5">
      <div className="h-full w-full bg-white/5" />
    </div>
    <div className="movie-card__body">
      <div className="h-4 w-4/5 rounded bg-white/10" />
      <div className="h-3 w-full rounded bg-white/10" />
      {!showcase && <div className="mt-auto h-9 w-full rounded bg-white/10" />}
    </div>
  </div>
);

export default MovieCardSkeleton;
