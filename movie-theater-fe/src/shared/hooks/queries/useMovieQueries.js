import { useQuery } from '@tanstack/react-query';
import { movieService } from '../../services/movieService';
import { queryKeys } from './queryKeys';

export function useMoviesList(params, enabled = true) {
  return useQuery({
    queryKey: queryKeys.movies(params),
    queryFn: () => movieService.getMovies(params),
    enabled: Boolean(enabled && params),
  });
}

export function useUpcomingMoviesList(page, size, enabled = true) {
  return useQuery({
    queryKey: queryKeys.movies({ type: 'upcoming', page, size }),
    queryFn: () => movieService.getUpcomingMovies({ page, size }),
    enabled,
  });
}

export function useMovieFilterOptions() {
  return useQuery({
    queryKey: queryKeys.movieFilterOptions,
    queryFn: async () => {
      const [genres, countries, actors, cinemas] = await Promise.all([
        movieService.getGenres(),
        movieService.getCountries(),
        movieService.getActors(),
        movieService.getCinemas(),
      ]);
      return {
        genres: genres || [],
        countries: countries || [],
        actors: actors || [],
        cinemas: cinemas || [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
