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
  const baseParams = {
    status: 'NOW_SHOWING',
    requireBookableShowtime: true,
    size: 50,
  };
  const firstPage = await movieService.getMovies({ ...baseParams, page: 0 });
  if (!firstPage?.totalPages || firstPage.totalPages <= 1) {
    return firstPage;
  }

  const otherPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      movieService.getMovies({ ...baseParams, page: index + 1 }),
    ),
  );

  return {
    ...firstPage,
    content: [
      ...(firstPage.content ?? []),
      ...otherPages.flatMap((page) => page?.content ?? []),
    ],
  };
}

export function useNowShowingMovies() {
  return useQuery({
    queryKey: homeQueryKeys.nowShowing,
    queryFn: fetchNowShowingMovies,
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
