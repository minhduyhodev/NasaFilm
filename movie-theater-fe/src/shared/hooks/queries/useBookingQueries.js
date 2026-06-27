import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/bookingService';
import { enrichBookingsWithMovieMeta } from '../../../features/home/utils/movieUtils';
import { queryKeys } from './queryKeys';

async function fetchEnrichedBookings() {
  const data = await bookingService.getMyBookings();
  return enrichBookingsWithMovieMeta(data || []);
}

export function useMyBookings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: fetchEnrichedBookings,
    enabled,
  });
}

export function useInvalidateMyBookings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.myBookings });
}
