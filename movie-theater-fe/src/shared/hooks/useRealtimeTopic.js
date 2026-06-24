import { useEffect, useRef } from 'react';
import { stompSocketService } from '../services/stompSocketService';

export const useRealtimeTopic = (topic, onUpdate, debounceMs = 400) => {
  const handlerRef = useRef(onUpdate);

  useEffect(() => {
    handlerRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!topic) {
      return undefined;
    }

    let timerId = null;

    const debouncedHandler = () => {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        handlerRef.current?.();
      }, debounceMs);
    };

    const unsubscribe = stompSocketService.subscribe(topic, debouncedHandler);

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
      unsubscribe();
    };
  }, [topic, debounceMs]);
};
