import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import { orbitService } from '../services/orbitService';
import {
  getAccessibleOrbitRooms,
  mergeOrbitRoomEntries,
} from '../utils/orbitRecentStorage';

export function useOrbitAccessibleRooms(options = {}) {
  const { enabled = true } = options;
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setRooms([]);
      return;
    }

    const recent = getAccessibleOrbitRooms();

    setIsLoading(true);
    try {
      const apiRooms = await orbitService.getActiveRooms();
      setRooms(mergeOrbitRoomEntries(apiRooms, recent));
    } catch {
      setRooms(mergeOrbitRoomEntries([], recent));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isAuthenticated, authLoading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) return undefined;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, isAuthenticated, refresh]);

  return { rooms, isLoading: isLoading || authLoading, refresh };
}
