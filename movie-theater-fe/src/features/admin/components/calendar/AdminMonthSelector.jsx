import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear } from './dateUtils';
import { useFloatingPanelPosition, ADMIN_FLOATING_BACKDROP_Z } from '../useFloatingPanelPosition';

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const YEARS_PER_PAGE = 12;

export default function AdminMonthSelector({ year, monthIndex, onChange }) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(year);
  const [yearPage, setYearPage] = useState(() => year - (year % YEARS_PER_PAGE));
  const panelStyle = useFloatingPanelPosition(open, triggerRef, {
    width: 308,
    maxHeight: 390,
    estimatedHeight: 390,
    align: 'left',
  });

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;

    setDraftYear(year);
    setYearPage(year - (year % YEARS_PER_PAGE));

    const onPointerDown = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, year]);

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPage + index);

  const selectMonth = (nextMonthIndex) => {
    onChange?.({ year: draftYear, monthIndex: nextMonthIndex });
    close();
  };

  return (
    <div className="adm-month-selector">
      <button
        ref={triggerRef}
        type="button"
        className={`adm-month-selector__trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={titleId}
        aria-label="Chọn tháng và năm"
        onClick={() => setOpen((value) => !value)}
      >
        <CalendarDays aria-hidden="true" />
        <span>{formatMonthYear(year, monthIndex)}</span>
      </button>

      {open && createPortal(
        <div
          className="adm-month-selector__backdrop"
          style={{ zIndex: ADMIN_FLOATING_BACKDROP_Z }}
          aria-hidden="true"
          onClick={close}
        />,
        document.body,
      )}

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          id={titleId}
          className="adm-month-selector__panel"
          style={panelStyle}
          role="dialog"
          aria-label="Chọn tháng và năm"
        >
          <div className="adm-month-selector__year-nav">
            <button
              type="button"
              className="adm-month-selector__nav-btn"
              aria-label={`12 năm trước, từ ${yearPage - YEARS_PER_PAGE} đến ${yearPage - 1}`}
              onClick={() => setYearPage((value) => value - YEARS_PER_PAGE)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <strong>{yearPage} – {yearPage + YEARS_PER_PAGE - 1}</strong>
            <button
              type="button"
              className="adm-month-selector__nav-btn"
              aria-label={`12 năm sau, từ ${yearPage + YEARS_PER_PAGE} đến ${yearPage + YEARS_PER_PAGE * 2 - 1}`}
              onClick={() => setYearPage((value) => value + YEARS_PER_PAGE)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="adm-month-selector__years" aria-label="Chọn năm">
            {years.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={`adm-month-selector__chip${candidate === draftYear ? ' is-selected' : ''}`}
                aria-pressed={candidate === draftYear}
                onClick={() => setDraftYear(candidate)}
              >
                {candidate}
              </button>
            ))}
          </div>

          <div className="adm-month-selector__divider" />
          <p className="adm-month-selector__label">Chọn tháng {draftYear}</p>
          <div className="adm-month-selector__months" aria-label={`Chọn tháng năm ${draftYear}`}>
            {MONTHS.map((label, candidate) => {
              const selected = draftYear === year && candidate === monthIndex;
              return (
                <button
                  key={label}
                  type="button"
                  className={`adm-month-selector__chip${selected ? ' is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => selectMonth(candidate)}
                >
                  T{candidate + 1}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
