import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import { useFloatingPanelPosition, ADMIN_FLOATING_BACKDROP_Z } from '../useFloatingPanelPosition';
import './AdminCalendar.css';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_H = 36;
const VISIBLE = 5;

const parseTime = (value) => {
  if (!value || typeof value !== 'string') return { hour: '09', minute: '00' };
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: '09', minute: '00' };
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return {
    hour: String(h).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
  };
};

const formatTime = (hour, minute) => `${hour}:${minute}`;

function TimeColumn({ items, value, onChange, label, disabled }) {
  const listRef = useRef(null);
  const ignoreScroll = useRef(false);
  const scrollTimer = useRef(null);

  const scrollToValue = useCallback((next, behavior = 'smooth') => {
    const el = listRef.current;
    if (!el) return;
    const index = items.indexOf(next);
    if (index < 0) return;
    ignoreScroll.current = true;
    el.scrollTo({ top: index * ITEM_H, behavior });
    window.setTimeout(() => {
      ignoreScroll.current = false;
    }, behavior === 'smooth' ? 320 : 40);
  }, [items]);

  useEffect(() => {
    scrollToValue(value, 'auto');
  }, [value, scrollToValue]);

  const handleScroll = () => {
    if (ignoreScroll.current || disabled) return;
    const el = listRef.current;
    if (!el) return;
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const index = Math.round(el.scrollTop / ITEM_H);
      const next = items[Math.min(items.length - 1, Math.max(0, index))];
      if (next && next !== value) onChange(next);
      scrollToValue(next, 'smooth');
    }, 80);
  };

  return (
    <div className="adm-time-col">
      <span className="adm-time-col__label">{label}</span>
      <div className="adm-time-col__viewport">
        <div className="adm-time-col__fade adm-time-col__fade--top" aria-hidden="true" />
        <div className="adm-time-col__fade adm-time-col__fade--bottom" aria-hidden="true" />
        <div className="adm-time-col__highlight" aria-hidden="true" />
        <div
          ref={listRef}
          className="adm-time-col__list"
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
        >
          <div className="adm-time-col__spacer" aria-hidden="true" />
          {items.map((item) => {
            const selected = item === value;
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                className={`adm-time-col__item${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(item);
                  scrollToValue(item, 'smooth');
                }}
              >
                {item}
              </button>
            );
          })}
          <div className="adm-time-col__spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

/**
 * Dark-cinema time picker (wheel columns, 24h HH:mm).
 */
export default function AdminTimePicker({
  value = '',
  onChange,
  label,
  placeholder = 'Chọn giờ',
  disabled = false,
  clearable = true,
  size = 'md',
  className = '',
  panelAlign = 'left',
  id,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const parsed = useMemo(() => parseTime(value), [value]);
  const [draft, setDraft] = useState(parsed);

  const panelStyle = useFloatingPanelPosition(open, triggerRef, {
    width: 220,
    maxHeight: 320,
    estimatedHeight: 300,
    align: panelAlign,
  });

  useEffect(() => {
    if (open) setDraft(parsed);
  }, [open, parsed]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const commit = (hour, minute) => {
    onChange?.(formatTime(hour, minute));
  };

  const applyAndClose = () => {
    commit(draft.hour, draft.minute);
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  const display = value ? formatTime(parsed.hour, parsed.minute) : '';

  return (
    <div ref={rootRef} className={`adm-timepicker ${className}`}>
      {label ? (
        <label className="adm-datepicker__label" htmlFor={id}>
          {label}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-required={required || undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`adm-datepicker__trigger${size === 'sm' ? ' adm-datepicker__trigger--sm' : ''}${
          open ? ' adm-datepicker__trigger--open' : ''
        }`}
      >
        <Clock className="adm-datepicker__icon" />
        <span className={`adm-datepicker__value${display ? '' : ' adm-datepicker__value--empty'}`}>
          {display || placeholder}
        </span>
        {clearable && value && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            className="adm-datepicker__clear"
            aria-label="Xóa giờ"
            onClick={clear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') clear(e);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </button>

      {open && createPortal(
        <div
          className="adm-datepicker__backdrop"
          style={{ zIndex: ADMIN_FLOATING_BACKDROP_Z }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />,
        document.body,
      )}

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          className="adm-timepicker__panel adm-datepicker__panel--portal"
          style={{
            ...panelStyle,
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            maxHeight: panelStyle.maxHeight,
          }}
          role="dialog"
          aria-label="Chọn giờ"
        >
          <div className="adm-timepicker__preview">
            <span className="adm-timepicker__preview-time">
              {draft.hour}
              <span className="adm-timepicker__preview-colon">:</span>
              {draft.minute}
            </span>
            <span className="adm-timepicker__preview-hint">24 giờ</span>
          </div>

          <div className="adm-timepicker__wheels" style={{ '--adm-time-item-h': `${ITEM_H}px`, '--adm-time-visible': VISIBLE }}>
            <TimeColumn
              items={HOURS}
              value={draft.hour}
              label="Giờ"
              disabled={disabled}
              onChange={(hour) => {
                setDraft((prev) => {
                  const next = { ...prev, hour };
                  commit(next.hour, next.minute);
                  return next;
                });
              }}
            />
            <TimeColumn
              items={MINUTES}
              value={draft.minute}
              label="Phút"
              disabled={disabled}
              onChange={(minute) => {
                setDraft((prev) => {
                  const next = { ...prev, minute };
                  commit(next.hour, next.minute);
                  return next;
                });
              }}
            />
          </div>

          <div className="adm-timepicker__footer">
            <button type="button" className="adm-cal-footer__btn" onClick={() => setOpen(false)}>
              Đóng
            </button>
            <button type="button" className="adm-cal-footer__btn adm-cal-footer__btn--accent" onClick={applyAndClose}>
              Xong
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
