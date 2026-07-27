import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Minus, Plus, Maximize2, Move } from 'lucide-react';
import './SeatMapGrid.css';

const ABSOLUTE_MIN_ZOOM = 0.12;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

/** Larger rooms need a lower zoom floor so "Vừa khung" still fits. */
const resolveMinZoom = (cols = 1, rowCount = 0) => {
  const seatsApprox = Math.max(cols, 1) * Math.max(rowCount, 1);
  if (seatsApprox >= 900 || cols >= 40) return 0.12;
  if (seatsApprox >= 500 || cols >= 30) return 0.16;
  if (seatsApprox >= 300 || cols >= 22) return 0.2;
  return 0.25;
};

/** Shrink natural seat size for very wide rooms so fit zoom stays usable. */
const resolveBaseScale = (cols = 1) => {
  if (cols >= 40) return 0.65;
  if (cols >= 32) return 0.75;
  if (cols >= 24) return 0.85;
  return 1;
};

/**
 * Comfortable-size seat map with zoom (+/−/fit) and drag-to-pan.
 * Large rooms (300–1000 seats) auto-fit into the panel instead of overflowing UI.
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

  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [didInit, setDidInit] = useState(false);

  const minZoom = resolveMinZoom(cols, rowCount);
  const baseScale = resolveBaseScale(cols);
  zoomRef.current = zoom;

  const measureFit = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return 1;

    const current = zoomRef.current || 1;
    const naturalW = Math.max(content.scrollWidth / current, 1);
    const naturalH = Math.max(content.scrollHeight / current, 1);
    const pad = 12;
    const nextFit = Math.min(
      (vp.clientWidth - pad) / naturalW,
      (vp.clientHeight - pad) / naturalH,
      1,
    );
    const floor = Math.max(ABSOLUTE_MIN_ZOOM, minZoom);
    const clamped = Math.max(floor, Math.min(1, nextFit));
    setFitZoom(clamped);
    return clamped;
  }, [minZoom]);

  const layoutKey = `${cols}-${rowCount}`;

  useEffect(() => {
    setDidInit(false);
  }, [layoutKey]);

  useLayoutEffect(() => {
    if (didInit) return;
    const fitted = measureFit();
    setZoom(fitted);
    setDidInit(true);
  }, [layoutKey, measureFit, didInit]);

  useEffect(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(() => {
      const fitted = measureFit();
      if (!didInit) {
        setZoom(fitted);
        setDidInit(true);
      }
    });
    ro.observe(vp);
    ro.observe(content);
    return () => ro.disconnect();
  }, [layoutKey, measureFit, didInit]);

  const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(Math.max(ABSOLUTE_MIN_ZOOM, minZoom), value));

  const zoomIn = () => setZoom((z) => clampZoom(Number((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoom((z) => clampZoom(Number((z - ZOOM_STEP).toFixed(2))));
  const zoomFit = () => setZoom(measureFit());
  const zoomReset = () => setZoom(1);

  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => clampZoom(Number((z + delta).toFixed(2))));
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, input, textarea, [data-no-pan]')) return;
    const vp = viewportRef.current;
    if (!vp) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: vp.scrollLeft,
      top: vp.scrollTop,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
    try {
      vp.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    const vp = viewportRef.current;
    if (!drag || !vp) return;
    vp.scrollLeft = drag.left - (e.clientX - drag.x);
    vp.scrollTop = drag.top - (e.clientY - drag.y);
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const vp = viewportRef.current;
    if (drag && vp) {
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
          Kéo để xem · Ctrl+cuộn để zoom
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
          <button type="button" className="seat-map-zoom__btn seat-map-zoom__btn--fit" onClick={zoomFit} title="Vừa màn hình">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Vừa khung</span>
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

      {zoom <= fitZoom + 0.02 && fitZoom < 0.95 && (
        <p className="seat-map-zoom__tip">
          {cols >= 30 || (cols * Math.max(rowCount, 1)) >= 500
            ? 'Phòng lớn — đang xem toàn cảnh. Bấm + hoặc 100% rồi kéo để chọn ghế.'
            : 'Đang xem toàn phòng — bấm + hoặc 100% để ghế to hơn, rồi kéo để chọn.'}
        </p>
      )}
    </div>
  );
};

export default SeatMapZoomViewport;
