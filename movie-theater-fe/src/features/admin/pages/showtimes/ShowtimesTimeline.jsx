import { useEffect, useMemo, useState } from 'react';
import { Building2, DoorOpen, AlertTriangle, CalendarX2 } from 'lucide-react';
import {
  STATUS_CONFIG,
  formatTimeOnly,
  getVnDecimalHour,
  isShowtimePlayingNow,
} from './showtimesConstants';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const LANE_HEIGHT = 38; // px cho mỗi tầng suất trong 1 phòng
const LANE_PAD = 7; // đệm trên/dưới của hàng phòng

/**
 * Xếp các suất trong 1 phòng vào các "lane": suất trùng khung giờ
 * được đẩy xuống tầng dưới thay vì vẽ chồng lên nhau.
 */
const layoutRoomLanes = (items, hourEnd) => {
  const laneEnds = [];
  const placed = items.map((st) => {
    const sh = getVnDecimalHour(st.startTime);
    let eh = getVnDecimalHour(st.endTime);
    if (eh <= sh) eh = hourEnd;
    let lane = laneEnds.findIndex((end) => sh >= end - 1e-9);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(eh);
    } else {
      laneEnds[lane] = eh;
    }
    return { st, sh, eh, lane };
  });
  return { placed, laneCount: Math.max(laneEnds.length, 1) };
};

/**
 * Room-occupancy timeline: 1 hàng / phòng chiếu, trục ngang là giờ trong ngày.
 * Giúp thấy ngay khoảng trống, suất chồng chéo và mật độ khai thác từng phòng.
 */
const ShowtimesTimeline = ({
  showtimes,
  isToday,
  conflicts,
  onSelect,
  selectedUuid,
}) => {
  // Re-render mỗi phút để vạch "bây giờ" trôi theo thời gian thực
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isToday) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [isToday]);

  const { cinemaGroups, hourStart, hourEnd } = useMemo(() => {
    const valid = showtimes.filter((s) => s.startTime && s.endTime);
    let minH = 8;
    let maxH = 24;
    valid.forEach((s) => {
      const sh = getVnDecimalHour(s.startTime);
      let eh = getVnDecimalHour(s.endTime);
      if (eh <= sh) eh = 24; // suất tràn qua nửa đêm — kẹp về cuối trục
      minH = Math.min(minH, Math.floor(sh));
      maxH = Math.max(maxH, Math.ceil(eh));
    });
    minH = clamp(minH, 0, 23);
    maxH = clamp(maxH, minH + 4, 24);

    const map = {};
    valid.forEach((s) => {
      const cinema = s.cinemaName || 'Không rõ rạp';
      const room = s.cinemaRoomName || 'Không rõ phòng';
      ((map[cinema] ||= {})[room] ||= []).push(s);
    });

    const groups = Object.keys(map).sort().map((cinema) => ({
      cinema,
      rooms: Object.keys(map[cinema]).sort().map((room) => ({
        room,
        items: map[cinema][room].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
      })),
    }));

    return { cinemaGroups: groups, hourStart: minH, hourEnd: maxH };
  }, [showtimes]);

  const span = hourEnd - hourStart;
  const hours = Array.from({ length: span + 1 }, (_, i) => hourStart + i);
  const toPercent = (decimalHour) => clamp(((decimalHour - hourStart) / span) * 100, 0, 100);

  const now = new Date();
  const nowHour = getVnDecimalHour(now.toISOString());
  const showNowLine = isToday && nowHour >= hourStart && nowHour <= hourEnd;

  if (cinemaGroups.length === 0) {
    return (
      <div className="stx-empty adm-empty">
        <CalendarX2 className="stx-empty__icon" />
        <p className="stx-empty__title">Không có suất chiếu trong ngày này</p>
        <p className="stx-empty__sub">Chọn ngày khác trên thanh ngày, hoặc tạo suất chiếu mới / lịch tự động.</p>
      </div>
    );
  }

  return (
    <div className="stx-timeline view-fade-enter">
      {cinemaGroups.map(({ cinema, rooms }) => {
        const total = rooms.reduce((acc, r) => acc + r.items.length, 0);
        return (
          <section key={cinema} className="stx-cinema">
            <header className="stx-cinema__head">
              <Building2 className="w-4 h-4" />
              <h3 className="stx-cinema__name">{cinema}</h3>
              <span className="stx-cinema__meta">{rooms.length} phòng · {total} suất</span>
            </header>

            <div className="stx-scrollwrap st-scroll">
              <div className="stx-board">
                {/* Hour ruler */}
                <div className="stx-row stx-row--ruler">
                  <div className="stx-room-label stx-room-label--ruler" />
                  <div className="stx-track">
                    {hours.map((h) => (
                      <span
                        key={h}
                        className="stx-hour-tick"
                        style={{ left: `${toPercent(h)}%` }}
                      >
                        {String(h % 24).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>
                </div>

                {rooms.map(({ room, items }) => {
                  const { placed, laneCount } = layoutRoomLanes(items, hourEnd);
                  const rowHeight = laneCount * LANE_HEIGHT + LANE_PAD * 2;
                  return (
                    <div key={room} className="stx-row" style={{ minHeight: rowHeight }}>
                      <div className="stx-room-label">
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span className="stx-room-label__name" title={room}>{room}</span>
                        <span className="stx-room-label__count">{items.length}</span>
                      </div>
                      <div className="stx-track">
                        {hours.map((h) => (
                          <span key={h} className="stx-gridline" style={{ left: `${toPercent(h)}%` }} />
                        ))}
                        {showNowLine && (
                          <span className="stx-nowline" style={{ left: `${toPercent(nowHour)}%` }} />
                        )}
                        {placed.map(({ st, sh, eh, lane }) => {
                          const left = toPercent(sh);
                          const width = Math.max(toPercent(eh) - left, 1.25);
                          const cfg = STATUS_CONFIG[st.status] || STATUS_CONFIG.DRAFT;
                          const isConflict = conflicts?.has(st.uuid);
                          const playing = isShowtimePlayingNow(st, now);
                          return (
                            <button
                              key={st.uuid}
                              type="button"
                              className={[
                                'stx-block',
                                isConflict ? 'is-conflict' : '',
                                playing ? 'is-playing' : '',
                                selectedUuid === st.uuid ? 'is-active' : '',
                              ].join(' ')}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                top: LANE_PAD + lane * LANE_HEIGHT,
                                height: LANE_HEIGHT - 6,
                                '--stx-accent': cfg.accent,
                                '--stx-accent-bg': cfg.accentBg,
                              }}
                              onClick={() => onSelect?.(st)}
                              title={`${st.movieTitle}\n${formatTimeOnly(st.startTime)} → ${formatTimeOnly(st.endTime)} · ${cfg.label}${isConflict ? '\n⚠ Trùng khung giờ với suất khác trong phòng' : ''}`}
                            >
                              {isConflict && <AlertTriangle className="stx-block__warn" />}
                              <span className="stx-block__time">{formatTimeOnly(st.startTime)}</span>
                              <span className="stx-block__title">{st.movieTitle}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <div className="stx-legend">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="stx-legend__item">
            <i style={{ background: cfg.accent }} />
            {cfg.label}
          </span>
        ))}
        <span className="stx-legend__item stx-legend__item--conflict">
          <AlertTriangle className="w-3 h-3" />
          Trùng khung giờ
        </span>
      </div>
    </div>
  );
};

export default ShowtimesTimeline;
