import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Film } from 'lucide-react';
import { vnDayKey, dayKeyToDate } from './showtimesConstants';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const buildMonthMatrix = (year, month) => {
  // month: 0-11. Ô lịch tính theo lịch VN nhưng chỉ thao tác trên day-key nên không lệch múi giờ.
  const first = new Date(Date.UTC(year, month, 1, 5, 0, 0)); // 12:00 VN
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0 = Thứ 2
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = [];
  // Ngày cuối tháng trước
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month, -i, 5, 0, 0));
    cells.push({ date: d, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(Date.UTC(year, month, day, 5, 0, 0)), inMonth: true });
  }
  // Ngày đầu tháng sau — lấp đủ hàng cuối
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getTime() + 86400000), inMonth: false });
  }
  return cells;
};

/**
 * Bước 1 — Lịch tháng khổ lớn: mỗi ô ngày tóm tắt số suất, số phim,
 * chấm trạng thái và cảnh báo trùng giờ. Bấm vào ngày để đi tiếp.
 */
const ShowtimesCalendar = ({
  monthAnchor, // Date bất kỳ trong tháng đang xem
  onMonthChange,
  dayInfoMap, // Map<dayKey, {count, movies, selling, scheduled, draft, conflict}>
  todayKey,
  selectedDayKey,
  onSelectDay,
}) => {
  const year = monthAnchor.getUTCFullYear();
  const month = monthAnchor.getUTCMonth();

  const cells = useMemo(() => buildMonthMatrix(year, month), [year, month]);

  const monthLabel = dayKeyToDate(vnDayKey(new Date(Date.UTC(year, month, 15))))
    .toLocaleDateString('vi-VN', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

  const monthTotals = useMemo(() => {
    let count = 0;
    let conflict = 0;
    cells.forEach((c) => {
      if (!c.inMonth) return;
      const info = dayInfoMap.get(vnDayKey(c.date));
      if (info) {
        count += info.count;
        conflict += info.conflict;
      }
    });
    return { count, conflict };
  }, [cells, dayInfoMap]);

  const shiftMonth = (delta) => {
    onMonthChange(new Date(Date.UTC(year, month + delta, 1, 5, 0, 0)));
  };

  return (
    <div className="stc-calendar">
      <header className="stc-head">
        <div className="stc-head__title">
          <h3>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h3>
          <span className="stc-head__meta">
            {monthTotals.count} suất chiếu trong tháng
            {monthTotals.conflict > 0 && (
              <span className="stc-head__conflict">
                <AlertTriangle className="w-3 h-3" /> {monthTotals.conflict} trùng giờ
              </span>
            )}
          </span>
        </div>
        <div className="stc-head__nav">
          <button
            type="button"
            className="stc-nav-btn"
            onClick={() => onSelectDay(todayKey)}
          >
            Hôm nay
          </button>
          <button type="button" className="stc-nav-btn stc-nav-btn--icon" onClick={() => shiftMonth(-1)} aria-label="Tháng trước">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" className="stc-nav-btn stc-nav-btn--icon" onClick={() => shiftMonth(1)} aria-label="Tháng sau">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="stc-grid stc-grid--head">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className={`stc-weekday ${w === 'CN' ? 'is-sunday' : ''}`}>{w}</span>
        ))}
      </div>

      <div className="stc-grid stc-grid--body">
        {cells.map(({ date, inMonth }, i) => {
          const key = vnDayKey(date);
          const info = dayInfoMap.get(key);
          const isToday = key === todayKey;
          const isPast = key < todayKey;
          const isSelected = key === selectedDayKey;
          const dayNum = Number(key.slice(8, 10));
          return (
            <button
              key={key}
              type="button"
              className={[
                'stc-cell',
                inMonth ? '' : 'is-outside',
                isToday ? 'is-today' : '',
                isPast ? 'is-past' : '',
                isSelected ? 'is-selected' : '',
                info?.count ? 'has-data' : '',
              ].join(' ')}
              style={{ '--stagger': `${Math.min(i * 8, 260)}ms` }}
              onClick={() => onSelectDay(key)}
            >
              <span className="stc-cell__daynum">
                {dayNum}
                {isToday && <em>Hôm nay</em>}
              </span>

              {info?.count ? (
                <>
                  <span className="stc-cell__count">{info.count} suất</span>
                  <span className="stc-cell__movies">
                    <Film className="w-2.5 h-2.5" /> {info.movies} phim
                  </span>
                  <span className="stc-cell__dots">
                    {info.selling > 0 && <i className="dot dot--selling" title={`${info.selling} đang mở bán`} />}
                    {info.scheduled > 0 && <i className="dot dot--scheduled" title={`${info.scheduled} sắp chiếu`} />}
                    {info.draft > 0 && <i className="dot dot--draft" title={`${info.draft} nháp`} />}
                    {info.conflict > 0 && (
                      <span title={`${info.conflict} suất trùng giờ`} className="inline-flex">
                        <AlertTriangle className="stc-cell__warn" />
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <span className="stc-cell__empty">{inMonth && !isPast ? 'Trống' : ''}</span>
              )}
            </button>
          );
        })}
      </div>

      <footer className="stc-legend">
        <span><i className="dot dot--selling" /> Đang mở bán</span>
        <span><i className="dot dot--scheduled" /> Sắp chiếu</span>
        <span><i className="dot dot--draft" /> Nháp</span>
        <span className="stc-legend__warn"><AlertTriangle className="w-3 h-3" /> Trùng khung giờ</span>
      </footer>
    </div>
  );
};

export default ShowtimesCalendar;
