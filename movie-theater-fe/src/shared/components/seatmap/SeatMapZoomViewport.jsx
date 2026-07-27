import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Minus, Plus, Maximize2, Move } from 'lucide-react';
import './SeatMapGrid.css';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

/**
 * Comfortable-size seat map with zoom (+/−/fit) and drag-to-pan.
 * Large rooms stay tappable — pan/zoom instead of shrinking seats unreadably.
 */
const SeatMapZoomViewport = ({
  cols = 1,
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
    const clamped = Math.max(MIN_ZOOM, Math.min(1, nextFit));
    setFitZoom(clamped);
    return clamped;
  }, []);

  useLayoutEffect(() => {
    const fitted = measureFit();
    if (!didInit) {
      const initial = cols >= 18
        ? Math.min(1, Math.max(fitted, 0.85))
        : Math.min(1, Math.max(fitted, 0.95));
      setZoom(initial);
      setDidInit(true);
    }
  }, [cols, measureFit, didInit]);

  useEffect(() => {
    setDidInit(false);
  }, [cols]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      measureFit();
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [measureFit]);

  const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

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
          }}
        >
          {children}
        </div>
      </div>

      {zoom <= fitZoom + 0.02 && fitZoom < 0.95 && (
        <p className="seat-map-zoom__tip">
          Đang xem toàn phòng — bấm <strong>+</strong> hoặc <strong>100%</strong> để ghế to hơn, rồi kéo để chọn.
        </p>
      )}
    </div>
  );
};

export default SeatMapZoomViewport;
