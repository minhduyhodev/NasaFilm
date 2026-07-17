import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { walletService } from '../../services/walletService';
import { queryKeys } from './queryKeys';

export function useWalletSummary() {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: () => walletService.getWallet(),
  });
}

export function useWalletTransactions(page = 0, size = 10, type = null, date = null) {
  return useQuery({
    queryKey: queryKeys.walletTransactions(page, size, type, date),
    queryFn: () => walletService.getTransactions(page, size, type, date),
    placeholderData: keepPreviousData,
  });
}

export function useInvalidateWallet() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['wallet'] });
}
