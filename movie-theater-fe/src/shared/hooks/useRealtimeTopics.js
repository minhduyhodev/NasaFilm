import { useEffect, useMemo, useRef } from 'react';
import { stompSocketService } from '../services/stompSocketService';

/**
 * Subscribe to multiple STOMP topics with one handler.
 * @param {Array<string|null|undefined>} topics
 * @param {(payload: any, topic: string) => void} onUpdate
 * @param {number} [debounceMs=400]
 */
export const useRealtimeTopics = (topics, onUpdate, debounceMs = 400) => {
  const handlerRef = useRef(onUpdate);

  useEffect(() => {
    handlerRef.current = onUpdate;
  }, [onUpdate]);

  const normalizedTopics = useMemo(() => {
    const list = Array.isArray(topics) ? topics : [];
    return [...new Set(list.filter((topic) => typeof topic === 'string' && topic.trim()))].sort();
  }, [topics]);

  const topicsKey = normalizedTopics.join('|');

  useEffect(() => {
    if (!normalizedTopics.length) {
      return undefined;
    }

    const timers = new Map();
    const unsubscribers = normalizedTopics.map((topic) => {
      const debouncedHandler = (payload) => {
        const existing = timers.get(topic);
        if (existing) clearTimeout(existing);
        timers.set(topic, setTimeout(() => {
          handlerRef.current?.(payload, topic);
        }, debounceMs));
      };
      return stompSocketService.subscribe(topic, debouncedHandler);
    });

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [topicsKey, debounceMs]);
};
