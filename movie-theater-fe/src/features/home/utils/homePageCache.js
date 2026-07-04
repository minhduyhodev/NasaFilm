import { queryClient } from '../../../app/providers/QueryProvider';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { fetchNowShowingMovies, fetchUpcomingMoviesForHome, homeQueryKeys } from '../hooks/useHomeQueries';

export function prefetchNowShowingMovies() {
  return queryClient.fetchQuery({
    queryKey: homeQueryKeys.nowShowing,
    queryFn: fetchNowShowingMovies,
  });
}

export function prefetchUpcomingMovies() {
  return queryClient.fetchQuery({
    queryKey: homeQueryKeys.upcoming,
    queryFn: fetchUpcomingMoviesForHome,
  });
}

export function prefetchCinemas() {
  return queryClient.fetchQuery({
    queryKey: homeQueryKeys.cinemas,
    queryFn: () => movieService.getCinemas(),
  });
}

export function prefetchPublicShowtimes() {
  return queryClient.fetchQuery({
    queryKey: homeQueryKeys.publicShowtimes,
    queryFn: () => showtimeService.getPublicShowtimes(),
  });
}

export function prefetchTicketFilterData() {
  return Promise.all([
    prefetchNowShowingMovies(),
    prefetchCinemas(),
    prefetchPublicShowtimes(),
  ]);
}
