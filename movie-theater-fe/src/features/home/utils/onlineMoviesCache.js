import { queryClient } from '../../../app/providers/QueryProvider';
import { prefetchOnlineSpotlight } from '../../../shared/hooks/queries/useOnlineQueries';
import { queryKeys } from '../../../shared/hooks/queries/queryKeys';
import { mapApiMovies } from './movieUtils';

export function getCachedOnlineMovies() {
  const cached = queryClient.getQueryData(queryKeys.onlineSpotlight);
  return cached?.length ? cached : null;
}

export async function prefetchOnlineMovies({ force = false } = {}) {
  if (!force) {
    const existing = getCachedOnlineMovies();
    if (existing) return existing;
  }
  return prefetchOnlineSpotlight(queryClient);
}

export function prefetchOnlinePage() {
  prefetchOnlineMovies().catch(() => {});
  return import('../pages/OnlineMoviesPage');
}

export function invalidateOnlineMoviesCache() {
  queryClient.invalidateQueries({ queryKey: queryKeys.onlineSpotlight });
}

export { mapApiMovies };
