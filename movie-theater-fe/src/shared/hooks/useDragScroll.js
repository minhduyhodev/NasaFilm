import { useCallback, useEffect, useRef } from 'react';

const DRAG_THRESHOLD_PX = 8;

export function useDragScroll() {
  const ref = useRef(null);
  const dragState = useRef({
    active: false,
    dragged: false,
    startX: 0,
    scrollLeft: 0,
    pointerId: null,
  });
  const cleanupListenersRef = useRef(() => {});

  const finishDrag = useCallback((event) => {
    const element = ref.current;
    const state = dragState.current;
    if (!state.active) {
      return;
    }
    if (event && state.pointerId != null && event.pointerId !== state.pointerId) {
      return;
    }

    cleanupListenersRef.current();

    const didDrag = state.dragged;
    state.active = false;
    state.dragged = false;
    state.pointerId = null;

    if (element) {
      element.classList.remove('is-dragging');
    }

    if (didDrag && element) {
      const blockClick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopImmediatePropagation();
      };
      element.addEventListener('click', blockClick, { capture: true, once: true });
    }
  }, []);

  const onWindowPointerMove = useCallback((event) => {
    const element = ref.current;
    const state = dragState.current;
    if (!element || !state.active || event.pointerId !== state.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    if (!state.dragged && Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
      state.dragged = true;
      element.classList.add('is-dragging');
    }

    if (!state.dragged) {
      return;
    }

    event.preventDefault();
    element.scrollLeft = state.scrollLeft - deltaX;
  }, []);

  const onWindowPointerUp = useCallback((event) => {
    finishDrag(event);
  }, [finishDrag]);

  const onPointerDown = useCallback((event) => {
    const element = ref.current;
    if (!element || event.button !== 0) {
      return;
    }

    dragState.current = {
      active: true,
      dragged: false,
      startX: event.clientX,
      scrollLeft: element.scrollLeft,
      pointerId: event.pointerId,
    };

    const onMove = onWindowPointerMove;
    const onUp = onWindowPointerUp;

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    cleanupListenersRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  useEffect(() => () => cleanupListenersRef.current(), []);

  const onDragStart = useCallback((event) => {
    event.preventDefault();
  }, []);

  return {
    ref,
    dragScrollProps: {
      onPointerDown,
      onDragStart,
    },
  };
}

export default useDragScroll;
