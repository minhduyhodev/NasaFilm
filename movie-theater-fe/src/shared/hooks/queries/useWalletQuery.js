import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '../../services/walletService';
import { queryKeys } from './queryKeys';

export function useWalletSummary() {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: () => walletService.getWallet(),
  });
}

export function useInvalidateWallet() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
}
