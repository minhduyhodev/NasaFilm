import { useState, useEffect, useCallback, useMemo } from 'react';
import { vodService } from '../../../shared/services/vodService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { getOnlineMoviePath, getOnlineActionLabel } from '../utils/movieUtils';

const statusCache = new Map();

async function loadVodStatusBatch(uuids) {
  const filtered = uuids.filter(Boolean);
  const missing = filtered.filter((uuid) => !statusCache.has(uuid));

  if (missing.length > 0) {
    try {
      const batch = await vodService.getStatusBatch(missing);
      missing.forEach((uuid) => {
        statusCache.set(uuid, batch?.[uuid] ?? null);
      });
    } catch {
      missing.forEach((uuid) => statusCache.set(uuid, null));
    }
  }

  return Object.fromEntries(filtered.map((uuid) => [uuid, statusCache.get(uuid) ?? null]));
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
    [movieUuids]
  );
  const uuidKey = uniqueUuids.join(',');

  useEffect(() => {
    if (!isAuthenticated || uniqueUuids.length === 0) {
      setStatusMap({});
      return;
    }

    let active = true;
    loadVodStatusBatch(uniqueUuids).then((map) => {
      if (active) setStatusMap(map);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, uuidKey, uniqueUuids]);

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
