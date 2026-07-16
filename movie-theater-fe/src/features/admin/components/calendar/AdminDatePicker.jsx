import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  WEEKDAY_SHORT,
  formatDisplayDate,
  formatMonthLabel,
  getMonthGrid,
  isDateDisabled,
  parseIsoDate,
  shiftMonth,
  todayIso,
} from './dateUtils';
import './AdminCalendar.css';

/**
 * Dark-cinema date picker (BookingHub-style month popover).
 * Value / onChange use ISO date strings: YYYY-MM-DD.
 */
export default function AdminDatePicker({
  value = '',
  onChange,
  label,
  placeholder = 'Chọn ngày',
  min,
  max,
  disabled = false,
  clearable = true,
  size = 'md',
  className = '',
  panelAlign = 'left',
  id,
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const today = todayIso();

  const initial = useMemo(() => {
    if (selected) return { year: selected.year, monthIndex: selected.monthIndex };
    const t = parseIsoDate(today);
    return { year: t.year, monthIndex: t.monthIndex };
  }, [selected, today]);

  const [view, setView] = useState(initial);

  useEffect(() => {
    if (open) setView(initial);
  }, [open, initial]);

  const days = useMemo(() => getMonthGrid(view.year, view.monthIndex), [view.year, view.monthIndex]);

  const selectDay = (iso) => {
    if (isDateDisabled(iso, min, max)) return;
    onChange?.(iso);
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className={`adm-datepicker ${className}`}>
      {label ? (
        <label className="adm-datepicker__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`adm-datepicker__trigger${size === 'sm' ? ' adm-datepicker__trigger--sm' : ''}${
          open ? ' adm-datepicker__trigger--open' : ''
        }`}
      >
        <Calendar className="adm-datepicker__icon" />
        <span className={`adm-datepicker__value${value ? '' : ' adm-datepicker__value--empty'}`}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        {clearable && value && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            className="adm-datepicker__clear"
            aria-label="Xóa ngày"
            onClick={clear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') clear(e);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </button>

      {open && (
        <>
          <div className="adm-datepicker__backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`adm-datepicker__panel${panelAlign === 'right' ? ' adm-datepicker__panel--right' : ''}`}
            role="dialog"
            aria-label="Chọn ngày"
          >
            <div className="adm-cal-nav">
              <button
                type="button"
                className="adm-cal-nav__btn"
                aria-label="Tháng trước"
                onClick={() => setView((v) => shiftMonth(v.year, v.monthIndex, -1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="adm-cal-nav__title">{formatMonthLabel(view.year, view.monthIndex)}</span>
              <button
                type="button"
                className="adm-cal-nav__btn"
                aria-label="Tháng sau"
                onClick={() => setView((v) => shiftMonth(v.year, v.monthIndex, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="adm-cal-weekdays">
              {WEEKDAY_SHORT.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="adm-cal-days">
              {days.map((d) => {
                const disabledDay = isDateDisabled(d.iso, min, max);
                const isSelected = value === d.iso;
                const isToday = d.iso === today;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => selectDay(d.iso)}
                    className={[
                      'adm-cal-day',
                      !d.isCurrentMonth ? 'adm-cal-day--outside' : '',
                      isToday ? 'adm-cal-day--today' : '',
                      isSelected ? 'adm-cal-day--selected' : '',
                      disabledDay ? 'adm-cal-day--disabled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>

            <div className="adm-cal-footer">
              <button
                type="button"
                className="adm-cal-footer__btn"
                onClick={() => {
                  if (clearable) onChange?.('');
                  setOpen(false);
                }}
              >
                Xóa
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="adm-cal-footer__btn adm-cal-footer__btn--accent"
                  onClick={() => {
                    if (!isDateDisabled(today, min, max)) {
                      onChange?.(today);
                      setOpen(false);
                    }
                  }}
                >
                  Hôm nay
                </button>
                <button type="button" className="adm-cal-footer__btn adm-cal-footer__btn--accent" onClick={() => setOpen(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
