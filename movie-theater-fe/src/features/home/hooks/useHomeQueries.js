import { useQuery } from '@tanstack/react-query';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';

export const homeQueryKeys = {
  nowShowing: ['home', 'nowShowing'],
  upcoming: ['home', 'upcoming'],
  cinemas: ['home', 'cinemas'],
  publicShowtimes: ['home', 'publicShowtimes'],
};

async function fetchAllMoviePages(baseParams) {
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

export async function fetchNowShowingMovies() {
  const withBookableShowtime = await fetchAllMoviePages({
    status: 'NOW_SHOWING',
    requireBookableShowtime: true,
    size: 50,
  });

  if (withBookableShowtime?.content?.length) {
    return withBookableShowtime;
  }

  // Fallback: phim status NOW_SHOWING khi chưa có suất chiếu bookable (dev/seed thiếu showtime)
  return fetchAllMoviePages({
    status: 'NOW_SHOWING',
    size: 50,
  });
}

export async function fetchUpcomingMoviesForHome() {
  const upcoming = await movieService.getUpcomingMovies({ page: 0, size: 20 });
  if (upcoming?.content?.length) {
    return upcoming;
  }

  return movieService.getMovies({
    status: 'COMING_SOON',
    page: 0,
    size: 20,
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
    queryFn: fetchUpcomingMoviesForHome,
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
