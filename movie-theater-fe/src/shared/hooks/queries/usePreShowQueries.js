import { useQuery } from '@tanstack/react-query';
import { preShowService } from '../../services/preShowService';
import { queryKeys } from './queryKeys';

export function useBoardingPass(bookingUuid, enabled = true) {
  return useQuery({
    queryKey: queryKeys.boardingPass(bookingUuid),
    queryFn: () => preShowService.getBoardingPass(bookingUuid),
    enabled: Boolean(bookingUuid) && enabled,
    staleTime: 30_000,
  });
}
