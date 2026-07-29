import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { favoriteService } from '../../../shared/services/favoriteService';
import { notificationService } from '../../../shared/services/notificationService';
import { queryKeys } from '../../../shared/hooks/queries/queryKeys';

export const FAVORITE_STORAGE_KEY = 'nasa_guest_favorites';

export const readGuestFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const writeGuestFavorites = (ids) => {
  localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(ids));
};

const toFavoriteUuid = (item) =>
  String(item?.movieUuid || item?.uuid || item?.movie?.uuid || item?.id || '');

/** Single shared favorites list — avoids N+1 isFavorite calls per movie card */
export const useFavoriteIdSet = () => {
  const { isAuthenticated } = useAuthContext();

  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => favoriteService.list(),
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
    select: (data) => {
      const list = Array.isArray(data) ? data : [];
      return new Set(list.map(toFavoriteUuid).filter(Boolean));
    },
  });
};

export const useMovieFavorite = (movieUuid, { quiet = false } = {}) => {
  const { isAuthenticated } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: favoriteIds } = useFavoriteIdSet();
  const [guestTick, setGuestTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const isFavorite = useMemo(() => {
    if (!movieUuid) return false;
    if (!isAuthenticated) {
      void guestTick;
      return readGuestFavorites().includes(movieUuid);
    }
    return favoriteIds?.has(String(movieUuid)) ?? false;
  }, [movieUuid, isAuthenticated, favoriteIds, guestTick]);

  const toggleFavorite = useCallback(async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!movieUuid || isLoading) return;
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        const guest = readGuestFavorites();
        const next = guest.includes(movieUuid)
          ? guest.filter((id) => id !== movieUuid)
          : [...guest, movieUuid];
        writeGuestFavorites(next);
        setGuestTick((n) => n + 1);
        if (!quiet) {
          notificationService.success(next.includes(movieUuid) ? 'Đã lưu phim' : 'Đã bỏ lưu phim');
        }
        return;
      }

      if (isFavorite) {
        await favoriteService.remove(movieUuid);
        queryClient.setQueryData(queryKeys.favorites, (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.filter((item) => toFavoriteUuid(item) !== String(movieUuid));
        });
        if (!quiet) notificationService.success('Đã bỏ lưu phim');
      } else {
        await favoriteService.add(movieUuid);
        queryClient.setQueryData(queryKeys.favorites, (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((item) => toFavoriteUuid(item) === String(movieUuid))) return list;
          return [...list, { movieUuid, uuid: movieUuid }];
        });
        if (!quiet) notificationService.success('Đã lưu vào Phim của tôi');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    } catch (err) {
      notificationService.error(err?.message || 'Không thể cập nhật yêu thích');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isFavorite, isLoading, movieUuid, quiet, queryClient]);

  return { isFavorite, isLoading, toggleFavorite };
};
