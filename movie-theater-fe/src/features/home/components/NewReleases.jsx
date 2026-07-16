import { useState, useEffect, useMemo } from 'react';
import { movieService } from '../../../shared/services/movieService';
import { mapApiMovies, filterOnlineMovies, sortMoviesByReleaseDate } from '../utils/movieUtils';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';

const NewReleases = ({
  onlineOnly = false,
  movies: moviesProp,
  getOnlinePath: getOnlinePathProp,
  getActionLabel: getActionLabelProp,
}) => {
  const [movies, setMovies] = useState(() =>
    moviesProp?.length ? sortMoviesByReleaseDate(moviesProp).slice(0, 6) : []
  );
  const [isLoading, setIsLoading] = useState(!moviesProp?.length);
  const routeMovieIds = useMemo(
    () => (onlineOnly ? movies.map((m) => m.uuid) : []),
    [onlineOnly, movies]
  );
  const { getOnlinePath: getOnlinePathLocal, getActionLabel: getActionLabelLocal } = useOnlineVodRoutes(routeMovieIds);
  const getOnlinePath = getOnlinePathProp || getOnlinePathLocal;
  const getActionLabel = getActionLabelProp || getActionLabelLocal;

  useEffect(() => {
    if (moviesProp?.length) {
      setMovies(sortMoviesByReleaseDate(moviesProp).slice(0, 6));
      setIsLoading(false);
      return;
    }

    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const data = await movieService.getMovies({
          status: 'NOW_SHOWING',
          requireBookableShowtime: !onlineOnly,
          requireAwsStreaming: onlineOnly || undefined,
          onlineOnly: onlineOnly || undefined,
          page: 0,
          size: 12,
        });
        let list = mapApiMovies(data?.content || []);
        if (onlineOnly) list = filterOnlineMovies(list);
        setMovies(sortMoviesByReleaseDate(list).slice(0, 6));
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, [onlineOnly, moviesProp]);

  if (!isLoading && movies.length === 0) return null;

  return (
    <section>
      <div className="section-heading-row">
        <h2 className="section-heading">Mới ra mắt</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <MovieCardSkeleton key={i} />)
          : movies.map((movie) =>
              onlineOnly ? (
                <MovieCard
                  key={movie.uuid}
                  {...movie}
                  fromOnline
                  getOnlinePath={getOnlinePath}
                  actionLabel={getActionLabel(movie.uuid, 'Xem ngay')}
                />
              ) : (
                <MovieCard key={movie.uuid} {...movie} />
              )
            )}
      </div>
    </section>
  );
};

export default NewReleases;
