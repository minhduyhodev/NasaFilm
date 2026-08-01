import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  WEEKDAY_FULL,
  formatDisplayDate,
  getMonthGrid,
  parseIsoDate,
  shiftMonth,
  todayIso,
} from './dateUtils';
import AdminMonthSelector from './AdminMonthSelector';
import './AdminCalendar.css';

/**
 * BookingHub-style month calendar board + day detail side panel.
 *
 * events: [{ id, date: 'YYYY-MM-DD', label, color?, meta?, raw? }]
 * legend: [{ label, color }]
 * renderDetail(selectedDate, dayEvents) — optional custom side panel body
 */
export default function AdminMonthCalendar({
  year: controlledYear,
  monthIndex: controlledMonthIndex,
  onMonthChange,
  selectedDate,
  onSelectDate,
  events = [],
  legend = [],
  maxPerCell = 3,
  className = '',
  renderDetail,
  emptyTitle = 'Chọn một ngày',
  emptyDescription = 'Nhấp vào ô lịch để xem chi tiết theo ngày.',
  sideTitle,
}) {
  const today = todayIso();
  const parsedSelected = parseIsoDate(selectedDate);

  const [internal, setInternal] = useState(() => {
    if (parsedSelected) return { year: parsedSelected.year, monthIndex: parsedSelected.monthIndex };
    const t = parseIsoDate(today);
    return { year: t.year, monthIndex: t.monthIndex };
  });

  const year = controlledYear ?? internal.year;
  const monthIndex = controlledMonthIndex ?? internal.monthIndex;

  const setMonth = (next) => {
    if (onMonthChange) onMonthChange(next);
    else setInternal(next);
  };

  const days = useMemo(() => getMonthGrid(year, monthIndex), [year, monthIndex]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      if (!ev?.date) return;
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  return (
    <div className={`adm-month-cal ${className}`}>
      <div className="adm-month-cal__board">
        <div className="adm-month-cal__toolbar">
          <div className="adm-cal-nav">
            <button
              type="button"
              className="adm-cal-nav__btn"
              aria-label="Tháng trước"
              onClick={() => setMonth(shiftMonth(year, monthIndex, -1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <AdminMonthSelector year={year} monthIndex={monthIndex} onChange={setMonth} />
            <button
              type="button"
              className="adm-cal-nav__btn"
              aria-label="Tháng sau"
              onClick={() => setMonth(shiftMonth(year, monthIndex, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {legend.length > 0 && (
            <div className="adm-month-cal__legend">
              {legend.map((item) => (
                <span key={item.label} className="adm-month-cal__legend-item">
                  <span className="adm-month-cal__dot" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="adm-month-cal__grid-wrap">
          <div className="adm-month-cal__weekdays">
            {WEEKDAY_FULL.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="adm-month-cal__grid">
            {days.map((d) => {
              const dayEvents = eventsByDate.get(d.iso) || [];
              const visible = dayEvents.slice(0, maxPerCell);
              const more = dayEvents.length - visible.length;
              const isSelected = selectedDate === d.iso;
              const isToday = d.iso === today;
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => onSelectDate?.(d.iso)}
                  className={[
                    'adm-month-cal__cell',
                    !d.isCurrentMonth ? 'adm-month-cal__cell--outside' : '',
                    isSelected ? 'adm-month-cal__cell--selected' : '',
                    isToday ? 'adm-month-cal__cell--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="adm-month-cal__daynum">{d.day}</span>
                  <div className="adm-month-cal__events">
                    {visible.map((ev) => (
                      <div key={ev.id} className="adm-month-cal__event" title={ev.label}>
                        <span
                          className="adm-month-cal__dot"
                          style={{ background: ev.color || '#94a3b8' }}
                        />
                        <span className="adm-month-cal__event-label">{ev.label}</span>
                      </div>
                    ))}
                    {more > 0 && <span className="adm-month-cal__more">+{more} nữa</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="adm-month-cal__side">
        <div className="adm-month-cal__side-head">
          <div className="adm-month-cal__side-title">
            {sideTitle || (selectedDate ? formatDisplayDate(selectedDate) : 'Chi tiết ngày')}
          </div>
          {selectedDate ? (
            <div className="adm-month-cal__side-sub">
              {selectedEvents.length} mục · {formatDisplayDate(selectedDate)}
            </div>
          ) : (
            <div className="adm-month-cal__side-sub">Chưa chọn ngày</div>
          )}
        </div>
        <div className="adm-month-cal__side-body">
          {!selectedDate ? (
            <div className="adm-month-cal__empty">
              <CalendarDays className="adm-month-cal__empty-icon" />
              <div className="adm-month-cal__empty-title">{emptyTitle}</div>
              <p className="adm-month-cal__empty-desc">{emptyDescription}</p>
            </div>
          ) : renderDetail ? (
            renderDetail(selectedDate, selectedEvents)
          ) : selectedEvents.length === 0 ? (
            <div className="adm-month-cal__empty">
              <CalendarDays className="adm-month-cal__empty-icon" />
              <div className="adm-month-cal__empty-title">Không có dữ liệu</div>
              <p className="adm-month-cal__empty-desc">Ngày này chưa có mục nào.</p>
            </div>
          ) : (
            <div className="adm-month-cal__list">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="adm-month-cal__list-item">
                  <span className="adm-month-cal__dot mt-1.5" style={{ background: ev.color || '#94a3b8' }} />
                  <div className="adm-month-cal__list-item-main">
                    <div className="adm-month-cal__list-item-title">{ev.label}</div>
                    {ev.meta ? <div className="adm-month-cal__list-item-meta">{ev.meta}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
