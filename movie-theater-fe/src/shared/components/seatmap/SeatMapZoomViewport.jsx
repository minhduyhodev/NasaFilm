import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Minus, Plus, Move } from 'lucide-react';
import './SeatMapGrid.css';

const ABSOLUTE_MIN_ZOOM = 0.12;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;
const DRAG_THRESHOLD_PX = 6;

const isInteractiveSeatTarget = (target) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    'button, a, input, textarea, [data-no-pan], .seat, .seat-map-grid-cell, .aisle-slot-hit, [role="button"]',
  ));
};

const approxSeatCount = (cols = 1, rowCount = 0) =>
  Math.max(cols, 1) * Math.max(rowCount, 1);

const resolveMinZoom = (cols = 1, rowCount = 0) => {
  const seats = approxSeatCount(cols, rowCount);
  if (seats >= 900 || cols >= 40) return 0.12;
  if (seats >= 500 || cols >= 30) return 0.16;
  if (seats >= 300 || cols >= 22) return 0.2;
  return 0.25;
};

/** Cap for auto-scale — small rooms may zoom well above 100%. */
const resolveFitMaxZoom = (cols = 1, rowCount = 0) => {
  const seats = approxSeatCount(cols, rowCount);
  if (seats <= 40) return 1.95;
  if (seats <= 80) return 1.8;
  if (seats <= 140) return 1.65;
  if (seats <= 220) return 1.4;
  if (seats <= 320) return 1.2;
  return 1;
};

const resolveBaseScale = (cols = 1, rowCount = 0) => {
  const seats = approxSeatCount(cols, rowCount);
  if (cols >= 40 || seats >= 900) return 0.65;
  if (cols >= 32 || seats >= 600) return 0.75;
  if (cols >= 24 || seats >= 350) return 0.85;
  if (seats <= 60 && cols <= 14) return 1.08;
  return 1;
};

/** Ideal on-screen seat width (px) by room size — drives auto-scale. */
const resolveIdealSeatPx = (cols = 1, rowCount = 0) => {
  const seats = approxSeatCount(cols, rowCount);
  if (seats <= 40) return 52;
  if (seats <= 80) return 48;
  if (seats <= 140) return 44;
  if (seats <= 220) return 36;
  if (seats <= 350) return 30;
  if (seats <= 550) return 26;
  return 22;
};

const readRemPx = () => {
  if (typeof window === 'undefined') return 16;
  const value = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(value) && value > 0 ? value : 16;
};

const baseMetrics = (variant) => (
  variant === 'admin'
    ? { w: 2.75, h: 1.75, gap: 0.375 }
    : { w: 2.25, h: 1.5, gap: 0.4 }
);

/**
 * Comfortable seat map with zoom (+/−/auto-scale) and drag-to-pan.
 * Auto-scale sizes seats from seat count, then clamps to the viewport.
 */
const SeatMapZoomViewport = ({
  cols = 1,
  rowCount = 0,
  variant = 'booking',
  className = '',
  style,
  children,
  maxHeightClass = 'max-h-[min(72vh,760px)]',
}) => {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const dragRef = useRef(null);
  const zoomRef = useRef(1);
  const applyGenerationRef = useRef(0);

  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [didInit, setDidInit] = useState(false);

  const seatsApprox = approxSeatCount(cols, rowCount);
  const minZoom = resolveMinZoom(cols, rowCount);
  const fitMaxZoom = resolveFitMaxZoom(cols, rowCount);
  const baseScale = resolveBaseScale(cols, rowCount);
  zoomRef.current = zoom;

  const centerViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollLeft = Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2);
    vp.scrollTop = Math.max(0, (vp.scrollHeight - vp.clientHeight) / 2);
  }, []);

  const measureFit = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return 1;

    const rem = readRemPx();
    const metrics = baseMetrics(variant);
    const naturalSeatW = metrics.w * rem * baseScale;
    const naturalSeatH = metrics.h * rem * baseScale;
    const naturalGap = metrics.gap * rem * baseScale;
    const labelW = 2 * rem;
    const padX = 36;
    const padY = 56;

    const estimatedW = labelW + cols * naturalSeatW + Math.max(0, cols - 1) * naturalGap + padX;
    const estimatedH = padY + rowCount * (naturalSeatH + rem * 0.35) + rem * 2.5;

    // Prefer measuring real seat rows (ignore full-width screen chrome).
    const current = zoomRef.current || 1;
    const rows = content.querySelectorAll('.seat-map-row');
    let measuredW = 0;
    let measuredH = 0;
    rows.forEach((row) => {
      measuredW = Math.max(measuredW, row.scrollWidth / current);
      measuredH += row.getBoundingClientRect().height / current;
    });
    const screen = content.querySelector('[data-no-pan]');
    if (screen) {
      measuredH += screen.getBoundingClientRect().height / current;
    }

    const naturalW = Math.max(estimatedW, measuredW || 0, 1);
    const naturalH = Math.max(estimatedH, measuredH || 0, 1);

    const widthFit = (vp.clientWidth - 16) / naturalW;
    const heightFit = (vp.clientHeight - 16) / naturalH;

    // Target seat size from room density, then clamp into the panel.
    const idealSeatPx = resolveIdealSeatPx(cols, rowCount);
    const preferredZoom = idealSeatPx / Math.max(naturalSeatW, 1);
    const viewportHasSpareHeight = vp.clientHeight > naturalH * 1.1;

    let nextFit;
    if (seatsApprox <= 140) {
      // Small / medium: seat-count target first. Only clamp height when panel is taller.
      nextFit = Math.min(preferredZoom, widthFit * 1.35, fitMaxZoom, MAX_ZOOM);
      if (viewportHasSpareHeight) {
        nextFit = Math.min(nextFit, heightFit);
      }
    } else if (seatsApprox <= 320) {
      nextFit = Math.min(preferredZoom, widthFit, heightFit, fitMaxZoom, MAX_ZOOM);
    } else {
      // Large rooms: shrink to show the whole map.
      nextFit = Math.min(widthFit, heightFit, 1, MAX_ZOOM);
    }

    const floor = Math.max(ABSOLUTE_MIN_ZOOM, minZoom);
    return Math.max(floor, nextFit);
  }, [baseScale, cols, fitMaxZoom, minZoom, rowCount, seatsApprox, variant]);

  const applySmartZoom = useCallback((opts = { center: true }) => {
    const fitted = measureFit();
    setZoom(fitted);
    if (opts.center) {
      requestAnimationFrame(() => {
        requestAnimationFrame(centerViewport);
      });
    }
    return fitted;
  }, [centerViewport, measureFit]);

  const layoutKey = `${cols}-${rowCount}-${variant}`;

  useEffect(() => {
    setDidInit(false);
    applyGenerationRef.current += 1;
  }, [layoutKey]);

  useLayoutEffect(() => {
    if (didInit) return undefined;
    const generation = applyGenerationRef.current;
    const fitted = applySmartZoom({ center: true });
    setDidInit(true);

    // Re-measure after paint — fonts/images can shift row size.
    const t = window.setTimeout(() => {
      if (generation !== applyGenerationRef.current) return;
      applySmartZoom({ center: true });
    }, 60);

    return () => window.clearTimeout(t);
  }, [layoutKey, applySmartZoom, didInit]);

  useEffect(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content || typeof ResizeObserver === 'undefined') return undefined;

    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!didInit) {
          applySmartZoom({ center: true });
          setDidInit(true);
        }
      });
    });
    ro.observe(vp);
    ro.observe(content);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [layoutKey, applySmartZoom, didInit]);

  const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(Math.max(ABSOLUTE_MIN_ZOOM, minZoom), value));

  const zoomIn = () => setZoom((z) => clampZoom(Number((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoom((z) => clampZoom(Number((z - ZOOM_STEP).toFixed(2))));
  const zoomReset = () => {
    setZoom(1);
    requestAnimationFrame(() => requestAnimationFrame(centerViewport));
  };

  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => clampZoom(Number((z + delta).toFixed(2))));
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    if (isInteractiveSeatTarget(e.target)) return;
    const vp = viewportRef.current;
    if (!vp) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: vp.scrollLeft,
      top: vp.scrollTop,
      pointerId: e.pointerId,
      active: false,
    };
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    const vp = viewportRef.current;
    if (!drag || !vp || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setIsDragging(true);
      try {
        vp.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }

    vp.scrollLeft = drag.left - dx;
    vp.scrollTop = drag.top - dy;
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const vp = viewportRef.current;
    if (drag && vp && drag.active) {
      try {
        vp.releasePointerCapture?.(drag.pointerId);
      } catch {
        // ignore
      }
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className={`seat-map-zoom ${className}`} style={style} data-variant={variant}>
      <div className="seat-map-zoom__toolbar" data-no-pan>
        <span className="seat-map-zoom__hint">
          <Move className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
          Kéo bản đồ · Ctrl + cuộn để zoom
        </span>
        <div className="seat-map-zoom__controls">
          <button type="button" className="seat-map-zoom__btn" onClick={zoomOut} title="Thu nhỏ" aria-label="Thu nhỏ">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="seat-map-zoom__btn seat-map-zoom__btn--label" onClick={zoomReset} title="Zoom 100%">
            {zoomPercent}%
          </button>
          <button type="button" className="seat-map-zoom__btn" onClick={zoomIn} title="Phóng to" aria-label="Phóng to">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`seat-map-viewport seat-map-viewport--zoomable seat-map-viewport--${variant} custom-scrollbar ${maxHeightClass} ${isDragging ? 'is-dragging' : ''}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={contentRef}
          className="seat-map-viewport__inner seat-map-viewport__inner--zoomable flex flex-col gap-2"
          style={{
            '--seat-map-cols': Math.max(cols, 1),
            '--seat-zoom': zoom,
            '--seat-base-scale': baseScale,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default SeatMapZoomViewport;
