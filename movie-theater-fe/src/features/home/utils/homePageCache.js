import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';

const CACHE_TTL_MS = 3 * 60 * 1000;

const cache = {
  nowShowing: { data: null, at: 0, inflight: null },
  upcoming: { data: null, at: 0, inflight: null },
  cinemas: { data: null, at: 0, inflight: null },
  showtimes: { data: null, at: 0, inflight: null },
};

function isFresh(entry) {
  return entry.data && Date.now() - entry.at < CACHE_TTL_MS;
}

async function fetchCached(key, fetcher) {
  const entry = cache[key];
  if (isFresh(entry)) return entry.data;
  if (entry.inflight) return entry.inflight;

  entry.inflight = fetcher()
    .then((data) => {
      entry.data = data;
      entry.at = Date.now();
      return data;
    })
    .finally(() => {
      entry.inflight = null;
    });

  return entry.inflight;
}

export function prefetchNowShowingMovies() {
  return fetchCached('nowShowing', () =>
    movieService.getMovies({
      status: 'NOW_SHOWING',
      page: 0,
      size: 100,
      requireBookableShowtime: true,
    })
  );
}

export function prefetchUpcomingMovies() {
  return fetchCached('upcoming', () =>
    movieService.getUpcomingMovies({ page: 0, size: 20 })
  );
}

export function prefetchCinemas() {
  return fetchCached('cinemas', () => movieService.getCinemas());
}

export function prefetchPublicShowtimes() {
  return fetchCached('showtimes', () => showtimeService.getPublicShowtimes());
}

export function prefetchTicketFilterData() {
  return Promise.all([prefetchNowShowingMovies(), prefetchCinemas(), prefetchPublicShowtimes()]);
}
