import { useState, useEffect, useCallback, useMemo } from 'react';
import { vodService } from '../../../shared/services/vodService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { getOnlineMoviePath, getOnlineActionLabel } from '../utils/movieUtils';

const statusCache = new Map();

async function loadVodStatus(uuid) {
  if (!uuid) return null;
  if (statusCache.has(uuid)) {
    const cached = statusCache.get(uuid);
    return cached instanceof Promise ? cached : Promise.resolve(cached);
  }
  const promise = vodService
    .getStatus(uuid)
    .then((status) => {
      statusCache.set(uuid, status);
      return status;
    })
    .catch(() => {
      statusCache.set(uuid, null);
      return null;
    });
  statusCache.set(uuid, promise);
  return promise;
}

export const invalidateVodStatus = (uuid) => {
  if (uuid) statusCache.delete(uuid);
};

export const invalidateAllVodStatus = () => {
  statusCache.clear();
};

export function useOnlineVodRoutes(movieUuids = []) {
  const { isAuthenticated } = useAuthContext();
  const [statusMap, setStatusMap] = useState({});

  const uniqueUuids = useMemo(
    () => [...new Set((movieUuids || []).filter(Boolean))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movieUuids.join('|')]
  );

  useEffect(() => {
    if (!isAuthenticated || uniqueUuids.length === 0) {
      setStatusMap({});
      return;
    }

    let active = true;
    (async () => {
      const entries = await Promise.all(
        uniqueUuids.map(async (uuid) => [uuid, await loadVodStatus(uuid)])
      );
      if (active) setStatusMap(Object.fromEntries(entries));
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, uniqueUuids.join('|')]);

  const getOnlinePath = useCallback(
    (uuid) => getOnlineMoviePath(uuid, isAuthenticated ? statusMap[uuid] : null),
    [isAuthenticated, statusMap]
  );

  const getActionLabel = useCallback(
    (uuid, fallback = 'Xem ngay') =>
      getOnlineActionLabel(isAuthenticated ? statusMap[uuid] : null, fallback),
    [isAuthenticated, statusMap]
  );

  const getVodStatus = useCallback(
    (uuid) => (isAuthenticated ? statusMap[uuid] : null),
    [isAuthenticated, statusMap]
  );

  return { statusMap, getOnlinePath, getActionLabel, getVodStatus };
}
