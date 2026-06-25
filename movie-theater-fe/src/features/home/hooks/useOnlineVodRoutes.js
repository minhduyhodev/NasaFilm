import { useState, useEffect, useCallback, useMemo } from 'react';
import { vodService } from '../../../shared/services/vodService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { getOnlineMoviePath, getOnlineActionLabel } from '../utils/movieUtils';

const statusCache = new Map();

function toUuidKey(movieUuids) {
  if (!Array.isArray(movieUuids) || movieUuids.length === 0) return '';
  return [...new Set(movieUuids.filter(Boolean))].sort().join(',');
}

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

  const uuidKey = useMemo(
    () => toUuidKey(movieUuids),
    [movieUuids?.length ?? 0, movieUuids?.length ? toUuidKey(movieUuids) : '']
  );

  useEffect(() => {
    if (!isAuthenticated || !uuidKey) {
      setStatusMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return undefined;
    }

    let active = true;
    const uuids = uuidKey.split(',');

    loadVodStatusBatch(uuids).then((map) => {
      if (active) setStatusMap(map);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, uuidKey]);

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
