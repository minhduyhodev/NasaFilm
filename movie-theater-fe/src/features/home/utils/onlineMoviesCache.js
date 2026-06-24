import { movieService } from '../../../shared/services/movieService';
import { mapApiMovies, filterOnlineMovies, preloadHeroBackground } from './movieUtils';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedMovies = null;
let cachedAt = 0;
let inflightPromise = null;
let heroPreloadedFor = null;
let onlinePageChunkPromise = null;

export function getCachedOnlineMovies() {
  if (cachedMovies && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedMovies;
  }
  return null;
}

async function fetchAndCacheOnlineMovies() {
  const data = await movieService.getMovies({ status: 'NOW_SHOWING', page: 0, size: 50 });
  const onlineMovies = filterOnlineMovies(mapApiMovies(data?.content || []));

  const firstUuid = onlineMovies[0]?.uuid;
  if (firstUuid && heroPreloadedFor !== firstUuid) {
    await preloadHeroBackground(onlineMovies[0]);
    heroPreloadedFor = firstUuid;
  }

  cachedMovies = onlineMovies;
  cachedAt = Date.now();
  return onlineMovies;
}

export async function prefetchOnlineMovies({ force = false } = {}) {
  const existing = getCachedOnlineMovies();
  if (!force && existing) return existing;

  if (inflightPromise) return inflightPromise;

  inflightPromise = fetchAndCacheOnlineMovies()
    .catch((err) => {
      if (cachedMovies) return cachedMovies;
      throw err;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

export function prefetchOnlinePage() {
  prefetchOnlineMovies().catch(() => {});
  if (!onlinePageChunkPromise) {
    onlinePageChunkPromise = import('../pages/OnlineMoviesPage');
  }
  return onlinePageChunkPromise;
}

export function invalidateOnlineMoviesCache() {
  cachedMovies = null;
  cachedAt = 0;
  heroPreloadedFor = null;
}
