import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { showtimeRadarService } from '../../../shared/services/showtimeRadarService';
import { favoriteService } from '../../../shared/services/favoriteService';
import { notificationService } from '../../../shared/services/notificationService';
import { queryKeys } from '../../../shared/hooks/queries/queryKeys';
import { logger } from '../../../shared/utils/logger';

export const SHOWTIME_RADAR_STALE_TIME = 2 * 60 * 1000;

export const resolveRadarEmptyMessage = ({
  selectedGenres = [],
  includeFavorites = true,
  upcomingShowtimeCount = 0,
  enabled = false,
  favoriteMovieCount = 0,
} = {}) => {
  if (selectedGenres.length === 0 && !includeFavorites) {
    return 'Chọn thể loại hoặc bật phim yêu thích, sau đó bấm Lưu sở thích.';
  }
  if (!enabled) {
    return 'Bấm Lưu sở thích để kích hoạt gợi ý Radar.';
  }
  if (includeFavorites && favoriteMovieCount === 0) {
    return 'Bật gợi ý từ phim yêu thích nhưng bạn chưa lưu phim nào. Hãy bấm «Lưu phim» trên trang chi tiết phim.';
  }
  if (upcomingShowtimeCount === 0) {
    return 'Hiện chưa có suất chiếu mở bán trong 48 giờ tới. Radar sẽ cập nhật khi có lịch mới.';
  }
  if (selectedGenres.length > 0) {
    return 'Có suất chiếu trong 48 giờ nhưng chưa khớp thể loại hoặc phim yêu thích. Thử chọn thể loại khác hoặc lưu thêm phim yêu thích.';
  }
  return 'Chưa có suất phim yêu thích hoặc phim cùng gu trong 48 giờ tới. Radar sẽ thông báo khi có suất mới.';
};

export const useShowtimeRadarQuery = ({ enabled: enabledOverride } = {}) => {
  const { isAuthenticated } = useAuthContext();
  const enabled = enabledOverride ?? isAuthenticated;

  return useQuery({
    queryKey: queryKeys.showtimeRadar,
    queryFn: () => showtimeRadarService.getPreference(),
    enabled,
    staleTime: SHOWTIME_RADAR_STALE_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useShowtimeRadarRefresh = () => {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refreshSuggestions = useCallback(async () => {
    setRefreshing(true);
    try {
      const scan = await showtimeRadarService.getSuggestions();
      queryClient.setQueryData(queryKeys.showtimeRadar, (previous) => ({
        ...(previous ?? {}),
        suggestions: scan?.suggestions ?? [],
        upcomingShowtimeCount: scan?.upcomingShowtimeCount ?? 0,
      }));
    } catch (error) {
      notificationService.error('Không thể làm mới gợi ý');
      logger.error('Failed to refresh showtime radar:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return { refreshSuggestions, refreshing };
};

export const useShowtimeRadarWidget = () => {
  const { isAuthenticated } = useAuthContext();
  const radarQuery = useShowtimeRadarQuery();
  const favoritesQuery = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => favoriteService.list(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
  const { refreshSuggestions, refreshing } = useShowtimeRadarRefresh();
  const data = radarQuery.data;
  const favoriteMovieCount = favoritesQuery.data?.length ?? 0;

  const emptyMessage = resolveRadarEmptyMessage({
    selectedGenres: (data?.genreUuids ?? []).map(String),
    includeFavorites: data?.includeFavorites !== false,
    upcomingShowtimeCount: Number(data?.upcomingShowtimeCount ?? 0),
    enabled: Boolean(data?.enabled),
    favoriteMovieCount,
  });

  return {
    loading: radarQuery.isLoading,
    refreshing: refreshing || radarQuery.isFetching,
    enabled: Boolean(data?.enabled),
    suggestions: data?.suggestions ?? [],
    emptyMessage,
    refreshSuggestions,
  };
};
