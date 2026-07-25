import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './AuthDatePicker.css';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseIsoDate = (iso) => {
  if (!iso || typeof iso !== 'string') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDisplay = (iso) => {
  const date = parseIsoDate(iso);
  if (!date) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Custom DOB calendar — dark cinematic auth theme.
 * value / onChange dùng ISO `yyyy-mm-dd` (react-hook-form).
 */
export const AuthDatePicker = ({
  id,
  value = '',
  onChange,
  onBlur,
  max,
  error,
  label = 'Ngày sinh',
  placeholder = 'dd/mm/yyyy',
}) => {
  const rootRef = useRef(null);
  const yearsRef = useRef(null);
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const maxDate = useMemo(() => parseIsoDate(max) || startOfDay(new Date()), [max]);
  const minYear = 1920;
  const maxYear = maxDate.getFullYear();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('years'); // years | months | days — DOB ưu tiên chọn năm trước
  const [cursor, setCursor] = useState(() => selected || maxDate);

  useEffect(() => {
    if (!open) return undefined;
    setCursor(selected || maxDate);
    // Mở lịch ngày sinh → vào chọn năm ngay (không bắt bấm mũi tên từng tháng).
    setView(selected ? 'days' : 'years');
  }, [open, selected, maxDate]);

  useEffect(() => {
    if (!open || view !== 'years') return undefined;
    const active = yearsRef.current?.querySelector('.auth-datepicker__chip.is-active');
    active?.scrollIntoView({ block: 'center', behavior: 'auto' });
    return undefined;
  }, [open, view, cursor]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        onBlur?.();
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onBlur]);

  const yearList = useMemo(() => {
    const years = [];
    for (let y = maxYear; y >= minYear; y -= 1) years.push(y);
    return years;
  }, [maxYear]);

  const calendarDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const cells = [];

    for (let i = startPad - 1; i >= 0; i -= 1) {
      cells.push({
        date: new Date(year, month - 1, prevDays - i),
        outside: true,
      });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(year, month, day), outside: false });
    }
    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - (startPad + daysInMonth) + 1;
      cells.push({ date: new Date(year, month + 1, nextDay), outside: true });
    }
    return cells;
  }, [cursor]);

  const canGoPrevMonth = useMemo(() => {
    const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    return prev.getFullYear() > minYear || (prev.getFullYear() === minYear && prev.getMonth() >= 0);
  }, [cursor]);

  const canGoNextMonth = useMemo(() => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return next <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  }, [cursor, maxDate]);

  const isDisabled = useCallback(
    (date) => startOfDay(date) > maxDate,
    [maxDate],
  );

  const selectDay = (date) => {
    if (isDisabled(date)) return;
    onChange?.(toIsoDate(date));
    setOpen(false);
    onBlur?.();
  };

  const clearValue = () => {
    onChange?.('');
    setOpen(false);
    onBlur?.();
  };

  const shiftMonth = (delta) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    if (delta < 0 && !canGoPrevMonth) return;
    if (delta > 0 && !canGoNextMonth) return;
    setCursor(next);
  };

  const displayText = formatDisplay(value);

  return (
    <div className={`auth-field auth-datepicker ${error ? 'auth-field--error' : ''}`} ref={rootRef}>
      {label ? (
        <label className="auth-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}

      <button
        id={id}
        type="button"
        className={`auth-field__control auth-date auth-datepicker__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="auth-field__icon" aria-hidden>
          <Calendar size={15} />
        </span>
        <span className={`auth-date__display ${displayText ? '' : 'is-placeholder'}`}>
          {displayText || placeholder}
        </span>
        <span className={`auth-date__chevron${open ? ' is-open' : ''}`} aria-hidden>
          <ChevronDown size={14} />
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="auth-datepicker__panel"
            role="dialog"
            aria-label="Chọn ngày sinh"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="auth-datepicker__header">
              {view === 'days' ? (
                <>
                  <button
                    type="button"
                    className="auth-datepicker__nav"
                    onClick={() => shiftMonth(-1)}
                    disabled={!canGoPrevMonth}
                    aria-label="Tháng trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="auth-datepicker__title-group">
                    <button
                      type="button"
                      className="auth-datepicker__title-btn"
                      onClick={() => setView('months')}
                      aria-label="Chọn tháng"
                    >
                      <span>{MONTHS[cursor.getMonth()]}</span>
                      <ChevronDown size={12} />
                    </button>
                    <button
                      type="button"
                      className="auth-datepicker__title-btn auth-datepicker__title-btn--year"
                      onClick={() => setView('years')}
                      aria-label="Chọn năm sinh"
                    >
                      <span>{cursor.getFullYear()}</span>
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="auth-datepicker__nav"
                    onClick={() => shiftMonth(1)}
                    disabled={!canGoNextMonth}
                    aria-label="Tháng sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="auth-datepicker__nav"
                    onClick={() => setView(view === 'months' ? 'years' : 'days')}
                    aria-label="Quay lại"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="auth-datepicker__title-static">
                    {view === 'months' ? 'Chọn tháng' : 'Chọn năm sinh'}
                  </span>
                  <button
                    type="button"
                    className="auth-datepicker__nav"
                    onClick={() => setView(view === 'years' ? 'months' : 'days')}
                    aria-label="Tiếp tục"
                    disabled={view === 'years' && !cursor}
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {view === 'years' ? (
              <div className="auth-datepicker__years" ref={yearsRef}>
                <p className="auth-datepicker__hint">Vuốt để chọn năm sinh của bạn</p>
                {yearList.map((year) => {
                  const active = cursor.getFullYear() === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      className={`auth-datepicker__chip${active ? ' is-active' : ''}`}
                      onClick={() => {
                        const nextMonth = Math.min(
                          cursor.getMonth(),
                          year === maxYear ? maxDate.getMonth() : 11,
                        );
                        setCursor(new Date(year, nextMonth, 1));
                        setView('months');
                      }}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {view === 'months' ? (
              <div className="auth-datepicker__months">
                {MONTHS.map((monthLabel, index) => {
                  const probe = new Date(cursor.getFullYear(), index, 1);
                  const disabled = probe > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
                  const active = cursor.getMonth() === index;
                  return (
                    <button
                      key={monthLabel}
                      type="button"
                      className={`auth-datepicker__chip${active ? ' is-active' : ''}`}
                      disabled={disabled}
                      onClick={() => {
                        setCursor(new Date(cursor.getFullYear(), index, 1));
                        setView('days');
                      }}
                    >
                      {monthLabel.replace('Tháng ', 'T')}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {view === 'days' ? (
              <>
                <div className="auth-datepicker__weekdays">
                  {WEEKDAYS.map((day) => (
                    <span key={day} className="auth-datepicker__weekday">
                      {day}
                    </span>
                  ))}
                </div>
                <div className="auth-datepicker__grid">
                  {calendarDays.map(({ date, outside }) => {
                    const disabled = isDisabled(date);
                    const selectedDay = isSameDay(date, selected);
                    const isToday = isSameDay(date, startOfDay(new Date()));
                    return (
                      <button
                        key={toIsoDate(date)}
                        type="button"
                        className={[
                          'auth-datepicker__day',
                          outside ? 'is-outside' : '',
                          selectedDay ? 'is-selected' : '',
                          isToday ? 'is-today' : '',
                          disabled ? 'is-disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={disabled}
                        onClick={() => selectDay(date)}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="auth-datepicker__footer">
              <button type="button" className="auth-datepicker__footer-btn" onClick={clearValue}>
                Xóa
              </button>
              <button
                type="button"
                className="auth-datepicker__footer-btn auth-datepicker__footer-btn--accent"
                disabled={isDisabled(maxDate)}
                onClick={() => selectDay(maxDate)}
              >
                Đủ 12 tuổi
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? <p className="auth-field__error">{error.message || error}</p> : null}
    </div>
  );
};

export default AuthDatePicker;
