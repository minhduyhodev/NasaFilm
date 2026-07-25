import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { movieService } from '../../../shared/services/movieService';
import { mapApiMovies, filterOnlineMovies, getMovieDetailPath, sortMoviesByReleaseDate } from '../utils/movieUtils';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';
import PosterImage from '../../../shared/components/PosterImage';

const ExclusiveCollection = ({ onlineOnly = false, movies: moviesProp, getOnlinePath: getOnlinePathProp }) => {
  const [movies, setMovies] = useState(() => {
    if (!moviesProp?.length) return [];
    const onlineOnlyList = moviesProp.filter((m) => m.screeningMode === 'ONLINE_ONLY');
    const bothList = moviesProp.filter((m) => m.screeningMode === 'BOTH');
    return sortMoviesByReleaseDate([...onlineOnlyList, ...bothList]).slice(0, 4);
  });
  const [isLoading, setIsLoading] = useState(!moviesProp?.length);
  const routeMovieIds = useMemo(
    () => (onlineOnly ? movies.map((m) => m.uuid) : []),
    [onlineOnly, movies]
  );
  const { getOnlinePath: getOnlinePathLocal } = useOnlineVodRoutes(routeMovieIds);
  const resolvePath = (uuid) => {
    if (onlineOnly) {
      return getOnlinePathProp ? getOnlinePathProp(uuid) : getOnlinePathLocal(uuid);
    }
    return getMovieDetailPath(uuid);
  };

  useEffect(() => {
    if (moviesProp?.length) {
      const onlineOnlyList = moviesProp.filter((m) => m.screeningMode === 'ONLINE_ONLY');
      const bothList = moviesProp.filter((m) => m.screeningMode === 'BOTH');
      setMovies(sortMoviesByReleaseDate([...onlineOnlyList, ...bothList]).slice(0, 4));
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await movieService.getMovies({
          status: 'NOW_SHOWING',
          onlineOnly: true,
          requireAwsStreaming: true,
          page: 0,
          size: 30,
        });
        let list = filterOnlineMovies(mapApiMovies(data?.content || []));
        const onlineOnlyList = list.filter((m) => m.screeningMode === 'ONLINE_ONLY');
        const bothList = list.filter((m) => m.screeningMode === 'BOTH');
        const curated = sortMoviesByReleaseDate([...onlineOnlyList, ...bothList]).slice(0, 4);
        setMovies(curated);
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [moviesProp]);

  if (!isLoading && movies.length === 0) return null;

  const [featured, ...rest] = movies;

  return (
    <section>
      <div className="section-heading-row">
        <h2 className="section-heading">Bộ sưu tập độc quyền</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 auto-rows-[180px] md:auto-rows-[200px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-white/5 animate-pulse min-h-[180px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 auto-rows-[180px] md:auto-rows-[200px]">
          {featured && (
            <Link
              to={resolvePath(featured.uuid)}
              className="md:row-span-2 relative overflow-hidden rounded-sm border border-white/5 group min-h-[260px] md:min-h-0"
            >
              <PosterImage
                src={featured.primaryMediaUrl || featured.poster}
                alt={featured.title}
                width={600}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5 md:p-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-semibold mb-1.5">
                  {featured.screeningMode === 'ONLINE_ONLY' ? 'Độc quyền online' : 'Xem online'}
                </p>
                <h3 className="text-lg md:text-xl font-black text-white uppercase line-clamp-2">
                  {featured.title}
                </h3>
                <span className="inline-block mt-3 btn-gold-outline text-[10px] py-1.5 px-3">Khám phá</span>
              </div>
            </Link>
          )}

          {rest.map((movie) => (
            <Link
              key={movie.uuid}
              to={resolvePath(movie.uuid)}
              className={`relative overflow-hidden rounded-sm border border-white/5 group ${rest.indexOf(movie) === 0 ? 'md:col-span-2' : ''}`}
            >
              <PosterImage
                src={movie.primaryMediaUrl || movie.poster}
                alt={movie.title}
                width={500}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 md:p-5">
                <h3 className="text-sm md:text-base font-black text-white uppercase line-clamp-1">
                  {movie.title}
                </h3>
                <p className="text-[10px] text-white/50 mt-1">
                  {movie.genres?.slice(0, 2).join(' · ')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default ExclusiveCollection;
