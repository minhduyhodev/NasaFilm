import { useQuery } from '@tanstack/react-query';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';

export const homeQueryKeys = {
  nowShowing: ['home', 'nowShowing'],
  upcoming: ['home', 'upcoming'],
  cinemas: ['home', 'cinemas'],
  publicShowtimes: ['home', 'publicShowtimes'],
};

export async function fetchNowShowingMovies() {
  return movieService.getMovies({
    status: 'NOW_SHOWING',
    requireBookableShowtime: true,
    requireAwsStreaming: true,
    page: 0,
    size: 50,
  });
}

export function useNowShowingMovies() {
  return useQuery({
    queryKey: homeQueryKeys.nowShowing,
    queryFn: fetchNowShowingMovies,
    staleTime: 60_000,
  });
}

export function useUpcomingMovies() {
  return useQuery({
    queryKey: homeQueryKeys.upcoming,
    queryFn: () => movieService.getUpcomingMovies({ page: 0, size: 20 }),
    staleTime: 60_000,
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
