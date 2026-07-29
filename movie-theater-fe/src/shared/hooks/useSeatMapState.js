import { useCallback, useEffect, useRef, useState } from 'react';
import { bookingService } from '../services/bookingService';
import { stompSocketService, SEAT_MAP_REFRESH_MS } from '../services/stompSocketService';
import { useRealtimeTopic } from './useRealtimeTopic';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';
import { parseLayoutConfig } from '../utils/aisleLayoutUtils';
import { parseSeatMapSelection } from '../utils/orbitUtils';
import { deriveSeatGapState } from '../utils/seatGapUtils';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

function normalizeSeatUuids(uuids = []) {
  return [...new Set((uuids || []).filter(Boolean))];
}

function getSeatQueryKey(uuids) {
  return normalizeSeatUuids(uuids).sort().join(',');
}

/**
 * Shared seat-map fetch, parse, realtime refresh, lock countdown.
 */
export function useSeatMapState(showtimeUuid, options = {}) {
  const {
    enabled = true,
    dedupeInFlight = false,
    watchSeatMap = true,
    pollIntervalMs = SEAT_MAP_REFRESH_MS,
    enablePolling = true,
    enableRealtime = true,
    lockTimerEnabled = true,
    onLockTimeout,
    onFetchError,
  } = options;

  const [seatRows, setSeatRows] = useState([]);
  const [aisleLayout, setAisleLayout] = useState(() => parseLayoutConfig(null));
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [hasGapViolation, setHasGapViolation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  const seatRowsRef = useRef([]);
  const selectionIntentRef = useRef([]);
  const selectionIntentInitializedRef = useRef(false);
  const hasLocalSelectionMutationRef = useRef(false);
  const selectionRevisionRef = useRef(0);
  const requestSequenceRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const inFlightRef = useRef(null);
  const onLockTimeoutRef = useRef(onLockTimeout);
  const lockTimerEnabledRef = useRef(lockTimerEnabled);
  const lockTimeoutHandledRef = useRef(false);

  useEffect(() => {
    lockTimeoutHandledRef.current = false;
  }, [showtimeUuid, lockTimerEnabled]);

  useEffect(() => {
    onLockTimeoutRef.current = onLockTimeout;
  }, [onLockTimeout]);

  useEffect(() => {
    lockTimerEnabledRef.current = lockTimerEnabled;
  }, [lockTimerEnabled]);

  const setSelectionIntent = useCallback((uuids) => {
    hasLocalSelectionMutationRef.current = true;
    const nextUuids = normalizeSeatUuids(uuids);
    const previousUuids = selectionIntentRef.current;
    const previousKey = getSeatQueryKey(previousUuids);
    const nextKey = getSeatQueryKey(nextUuids);

    selectionIntentInitializedRef.current = true;
    if (previousKey !== nextKey) {
      selectionIntentRef.current = nextUuids;
      selectionRevisionRef.current += 1;
      latestRequestIdRef.current = ++requestSequenceRef.current;
      const { seatRows: nextRows, hasGapViolation: nextHasGapViolation } = deriveSeatGapState(
        seatRowsRef.current,
        nextUuids,
        previousUuids,
      );
      const parsedLocalRows = parseSeatMapSelection({ rows: nextRows });
      seatRowsRef.current = nextRows;
      setSeatRows(nextRows);
      setSelectedSeats(parsedLocalRows.selectedSeats.filter((seat) => nextUuids.includes(seat.seatUuid)));
      setHasGapViolation(nextHasGapViolation);
      if (nextUuids.length === 0) {
        setTimeLeft(null);
      }
    }

    return nextUuids;
  }, []);

  const seedSelectionIntent = useCallback((uuids) => {
    if (selectionIntentInitializedRef.current || hasLocalSelectionMutationRef.current) {
      return null;
    }

    const nextUuids = normalizeSeatUuids(uuids);
    selectionIntentInitializedRef.current = true;
    selectionIntentRef.current = nextUuids;
    selectionRevisionRef.current += 1;
    latestRequestIdRef.current = ++requestSequenceRef.current;
    return nextUuids;
  }, []);

  const clearSelection = useCallback(() => setSelectionIntent([]), [setSelectionIntent]);

  const applySeatMapData = useCallback((data, selectedUuids) => {
    if (!data?.rows) {
      return;
    }
    const parsed = parseSeatMapSelection(data);
    const selectedSet = new Set(selectedUuids);
    seatRowsRef.current = parsed.seatRows;
    setSeatRows(parsed.seatRows);
    if (parsed.aisleLayoutConfig) {
      setAisleLayout(parseLayoutConfig(parsed.aisleLayoutConfig));
    }
    setSelectedSeats(parsed.selectedSeats.filter((seat) => selectedSet.has(seat.seatUuid)));
    setHasGapViolation(parsed.hasGapViolation);
    setTimeLeft(selectedUuids.length > 0 ? parsed.timeLeft : null);
  }, []);

  const fetchSeatMap = useCallback(async (overrideUuids, fetchOptions = {}) => {
    const {
      silent = false,
      commitIntent = overrideUuids !== undefined,
    } = fetchOptions;
    if (!showtimeUuid || !enabled) {
      return undefined;
    }

    const requestedUuids = normalizeSeatUuids(
      overrideUuids !== undefined ? overrideUuids : selectionIntentRef.current,
    );
    if (commitIntent) {
      setSelectionIntent(requestedUuids);
    }

    const requestRevision = selectionRevisionRef.current;
    const requestQueryKey = getSeatQueryKey(requestedUuids);
    const inFlightKey = `${showtimeUuid}:${requestRevision}:${requestQueryKey}`;
    if (dedupeInFlight && inFlightRef.current?.key === inFlightKey) {
      return inFlightRef.current.request;
    }

    const requestId = ++requestSequenceRef.current;
    latestRequestIdRef.current = requestId;
    const request = (async () => {
      try {
        const data = await bookingService.getSeatMap(showtimeUuid, requestedUuids);
        const isCurrentRequest = requestId === latestRequestIdRef.current
          && requestRevision === selectionRevisionRef.current
          && requestQueryKey === getSeatQueryKey(selectionIntentRef.current);
        if (isCurrentRequest) {
          if (!selectionIntentInitializedRef.current && !hasLocalSelectionMutationRef.current) {
            const initialUuids = normalizeSeatUuids(
              parseSeatMapSelection(data).selectedSeats.map((seat) => seat.seatUuid),
            );
            selectionIntentInitializedRef.current = true;
            selectionIntentRef.current = initialUuids;
          }
          applySeatMapData(data, selectionIntentRef.current);
        }
      } catch (error) {
        logger.error('Failed to fetch seat map:', error);
        if (!silent) {
          if (onFetchError) {
            onFetchError(error);
          } else {
            notificationService.error('Không thể tải sơ đồ ghế');
          }
        }
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsMapLoading(false);
        }
        if (inFlightRef.current?.request === request) {
          inFlightRef.current = null;
        }
      }
    })();

    if (dedupeInFlight) {
      inFlightRef.current = { key: inFlightKey, request };
    }
    return request;
  }, [showtimeUuid, enabled, dedupeInFlight, applySeatMapData, onFetchError, setSelectionIntent]);

  const fetchSeatMapRef = useRef(fetchSeatMap);
  fetchSeatMapRef.current = fetchSeatMap;

  useEffect(() => {
    selectionIntentRef.current = [];
    selectionIntentInitializedRef.current = false;
    hasLocalSelectionMutationRef.current = false;
    selectionRevisionRef.current += 1;
    latestRequestIdRef.current = ++requestSequenceRef.current;
    inFlightRef.current = null;
    seatRowsRef.current = [];
    setSeatRows([]);
    setSelectedSeats([]);
    setHasGapViolation(false);
    setTimeLeft(null);
  }, [showtimeUuid]);

  useEffect(() => {
    if (!lockTimerEnabledRef.current || timeLeft === null) {
      return undefined;
    }
    if (timeLeft === 0) {
      if (lockTimeoutHandledRef.current) {
        return undefined;
      }
      lockTimeoutHandledRef.current = true;
      clearSelection();
      const handler = onLockTimeoutRef.current;
      Promise.resolve(handler?.())
        .catch((err) => logger.error('Failed to handle seat map event:', err))
        .finally(() => fetchSeatMapRef.current([], { silent: true, commitIntent: false }));
      setTimeLeft(null);
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, lockTimerEnabled, clearSelection]);

  useEffect(() => {
    if (!showtimeUuid || !enabled) {
      return undefined;
    }

    setIsMapLoading(true);
    fetchSeatMapRef.current();

    if (watchSeatMap) {
      stompSocketService.ensureConnected().catch(() => {});
      bookingService.watchSeatMap(showtimeUuid).catch(() => {});
    }

    let intervalId;
    if (enablePolling) {
      intervalId = setInterval(() => {
        if (enableRealtime && stompSocketService.isConnected()) {
          return;
        }
        fetchSeatMapRef.current(undefined, { silent: true });
      }, pollIntervalMs);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (watchSeatMap) {
        bookingService.unwatchSeatMap(showtimeUuid).catch(() => {});
      }
    };
  }, [showtimeUuid, enabled, watchSeatMap, enablePolling, enableRealtime, pollIntervalMs]);

  useRealtimeTopic(
    enableRealtime && showtimeUuid && enabled
      ? REALTIME_TOPICS.showtimeSeats(showtimeUuid)
      : null,
    () => fetchSeatMapRef.current(undefined, { silent: true }),
    400,
  );

  return {
    seatRows,
    aisleLayout,
    selectedSeats,
    setSelectedSeats,
    selectionIntentRef,
    setSelectionIntent,
    seedSelectionIntent,
    clearSelection,
    hasGapViolation,
    timeLeft,
    setTimeLeft,
    isMapLoading,
    fetchSeatMap,
    fetchSeatMapRef,
    applySeatMapData,
  };
}
