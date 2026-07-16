import { useCallback, useEffect, useRef, useState } from 'react';
import { bookingService } from '../services/bookingService';
import { stompSocketService, SEAT_MAP_REFRESH_MS } from '../services/stompSocketService';
import { useRealtimeTopic } from './useRealtimeTopic';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';
import { parseLayoutConfig } from '../utils/aisleLayoutUtils';
import { parseSeatMapSelection } from '../utils/orbitUtils';
import { notificationService } from '../services/notificationService';

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

  const selectedSeatsRef = useRef([]);
  const inFlightRef = useRef(null);
  const onLockTimeoutRef = useRef(onLockTimeout);
  const lockTimerEnabledRef = useRef(lockTimerEnabled);
  const lockTimeoutHandledRef = useRef(false);

  useEffect(() => {
    lockTimeoutHandledRef.current = false;
  }, [showtimeUuid, lockTimerEnabled]);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    onLockTimeoutRef.current = onLockTimeout;
  }, [onLockTimeout]);

  useEffect(() => {
    lockTimerEnabledRef.current = lockTimerEnabled;
  }, [lockTimerEnabled]);

  const applySeatMapData = useCallback((data) => {
    if (!data?.rows) {
      return;
    }
    const parsed = parseSeatMapSelection(data);
    setSeatRows(parsed.seatRows);
    if (parsed.aisleLayoutConfig) {
      setAisleLayout(parseLayoutConfig(parsed.aisleLayoutConfig));
    }
    setSelectedSeats(parsed.selectedSeats);
    setHasGapViolation(parsed.hasGapViolation);
    setTimeLeft(parsed.timeLeft);
  }, []);

  const fetchSeatMap = useCallback(async (overrideUuids, fetchOptions = {}) => {
    const { silent = false } = fetchOptions;
    if (!showtimeUuid || !enabled) {
      return undefined;
    }

    if (dedupeInFlight && inFlightRef.current) {
      return inFlightRef.current;
    }

    const request = (async () => {
      try {
        const uuids = overrideUuids !== undefined
          ? overrideUuids
          : selectedSeatsRef.current.map((seat) => seat.seatUuid);
        const data = await bookingService.getSeatMap(showtimeUuid, uuids);
        applySeatMapData(data);
      } catch (error) {
        console.error('Failed to fetch seat map:', error);
        if (!silent) {
          if (onFetchError) {
            onFetchError(error);
          } else {
            notificationService.error('Không thể tải sơ đồ ghế');
          }
        }
      } finally {
        setIsMapLoading(false);
        inFlightRef.current = null;
      }
    })();

    if (dedupeInFlight) {
      inFlightRef.current = request;
    }
    return request;
  }, [showtimeUuid, enabled, dedupeInFlight, applySeatMapData, onFetchError]);

  const fetchSeatMapRef = useRef(fetchSeatMap);
  fetchSeatMapRef.current = fetchSeatMap;

  useEffect(() => {
    if (!lockTimerEnabledRef.current || timeLeft === null) {
      return undefined;
    }
    if (timeLeft === 0) {
      if (lockTimeoutHandledRef.current) {
        return undefined;
      }
      lockTimeoutHandledRef.current = true;
      const handler = onLockTimeoutRef.current;
      if (handler) {
        Promise.resolve(handler()).catch(console.error);
      }
      setTimeLeft(null);
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, lockTimerEnabled]);

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
    hasGapViolation,
    timeLeft,
    setTimeLeft,
    isMapLoading,
    fetchSeatMap,
    fetchSeatMapRef,
    selectedSeatsRef,
    applySeatMapData,
  };
}
