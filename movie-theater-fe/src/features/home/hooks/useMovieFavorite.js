import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { favoriteService } from '../../../shared/services/favoriteService';
import { notificationService } from '../../../shared/services/notificationService';

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

export const useMovieFavorite = (movieUuid, { quiet = false } = {}) => {
  const { isAuthenticated } = useAuthContext();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!movieUuid) return;
    if (!isAuthenticated) {
      setIsFavorite(readGuestFavorites().includes(movieUuid));
      return;
    }
    favoriteService.isFavorite(movieUuid)
      .then(setIsFavorite)
      .catch(() => setIsFavorite(false));
  }, [movieUuid, isAuthenticated]);

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
        setIsFavorite(next.includes(movieUuid));
        if (!quiet) {
          notificationService.success(next.includes(movieUuid) ? 'Đã lưu phim' : 'Đã bỏ lưu phim');
        }
        return;
      }
      if (isFavorite) {
        await favoriteService.remove(movieUuid);
        setIsFavorite(false);
        if (!quiet) notificationService.success('Đã bỏ lưu phim');
      } else {
        await favoriteService.add(movieUuid);
        setIsFavorite(true);
        if (!quiet) notificationService.success('Đã lưu vào Phim của tôi');
      }
    } catch (err) {
      notificationService.error(err?.message || 'Không thể cập nhật yêu thích');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isFavorite, isLoading, movieUuid, quiet]);

  return { isFavorite, isLoading, toggleFavorite };
};
