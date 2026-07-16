import { useMemo } from 'react';
import { useNowShowingMovies } from '../hooks/useHomeQueries';
import { mapApiMovies } from '../utils/movieUtils';
import HomeMovieCarousel from './HomeMovieCarousel';

const NowShowing = () => {
  const { data, isLoading } = useNowShowingMovies();

  const moviesList = useMemo(() => {
    if (!data?.content?.length) return [];
    return mapApiMovies(data.content);
  }, [data]);

  return (
    <HomeMovieCarousel
      title="PHIM ĐANG CHIẾU"
      viewAllTo="/movies?tab=now-showing"
      moviesList={moviesList}
      isLoading={isLoading}
      actionLabel="Mua vé"
    />
  );
};

export default NowShowing;
