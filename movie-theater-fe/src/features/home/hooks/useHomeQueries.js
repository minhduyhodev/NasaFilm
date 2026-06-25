import { useQuery } from '@tanstack/react-query';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';

export const homeQueryKeys = {
  nowShowing: ['home', 'nowShowing'],
  upcoming: ['home', 'upcoming'],
  cinemas: ['home', 'cinemas'],
  publicShowtimes: ['home', 'publicShowtimes'],
};

export function useNowShowingMovies() {
  return useQuery({
    queryKey: homeQueryKeys.nowShowing,
    queryFn: () =>
      movieService.getMovies({
        status: 'NOW_SHOWING',
        page: 0,
        size: 100,
        requireBookableShowtime: true,
      }),
  });
}

export function useUpcomingMovies() {
  return useQuery({
    queryKey: homeQueryKeys.upcoming,
    queryFn: () => movieService.getUpcomingMovies({ page: 0, size: 20 }),
  });
}

export function useHomeCinemas() {
  return useQuery({
    queryKey: homeQueryKeys.cinemas,
    queryFn: () => movieService.getCinemas(),
  });
}

export function usePublicShowtimes() {
  return useQuery({
    queryKey: homeQueryKeys.publicShowtimes,
    queryFn: () => showtimeService.getPublicShowtimes(),
  });
}
