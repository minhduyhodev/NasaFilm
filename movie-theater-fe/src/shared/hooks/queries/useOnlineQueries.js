import { useQuery, useQueryClient } from '@tanstack/react-query';
import { movieService } from '../../services/movieService';
import { mapApiMovies, preloadHeroBackground } from '../../../features/home/utils/movieUtils';
import { queryKeys } from './queryKeys';

async function fetchOnlineSpotlight() {
  const data = await movieService.getMovies({
    status: 'NOW_SHOWING',
    page: 0,
    size: 50,
    onlineOnly: true,
  });
  const onlineMovies = mapApiMovies(data?.content || []);
  const first = onlineMovies[0];
  if (first?.uuid) {
    preloadHeroBackground(first).catch(() => {});
  }
  return onlineMovies;
}

export function useOnlineSpotlightMovies() {
  return useQuery({
    queryKey: queryKeys.onlineSpotlight,
    queryFn: fetchOnlineSpotlight,
  });
}

export function useOnlineCatalog(params, enabled = true) {
  return useQuery({
    queryKey: queryKeys.onlineCatalog(params),
    queryFn: () =>
      movieService.getMovies({
        status: 'NOW_SHOWING',
        onlineOnly: true,
        keyword: params.keyword || undefined,
        genreUuids: params.genreUuids,
        countryUuid: params.countryUuid || undefined,
        actorUuid: params.actorUuid || undefined,
        ageRestriction: params.ageRestriction || undefined,
        page: params.page,
        size: params.size,
      }),
    enabled,
  });
}

export function prefetchOnlineSpotlight(queryClient) {
  return queryClient.fetchQuery({
    queryKey: queryKeys.onlineSpotlight,
    queryFn: fetchOnlineSpotlight,
  });
}

export function useInvalidateOnlineSpotlight() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.onlineSpotlight });
}
