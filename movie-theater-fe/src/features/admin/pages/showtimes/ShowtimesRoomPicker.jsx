import { useMemo } from 'react';
import {
  Building2, MonitorPlay, ChevronRight, Users, AlertTriangle, Layers,
} from 'lucide-react';
import { isShowtimePlayingNow, formatTimeOnly } from './showtimesConstants';

const ROOM_TYPE_LABEL = {
  STANDARD: 'Digital',
  IMAX: 'IMAX',
  VIP: 'VIP',
  GOLD_CLASS: 'Gold Class',
  FOUR_DX: '4DX',
};

const roomTypeLabel = (t) => ROOM_TYPE_LABEL[String(t || '').toUpperCase()] || t || 'Digital';

/**
 * Bước 2 — Chọn Rạp & Phòng chiếu: gom suất chiếu của ngày đã chọn theo từng phòng
 * để quản trị viên đi thẳng vào khu vực cần điều phối, tránh nhiễu thông tin.
 */
const ShowtimesRoomPicker = ({
  cinemas,
  roomsByCinema,
  isLoadingRooms,
  dayShowtimes,
  conflicts,
  onSelectRoom, // (cinema, room|null) — null = cả rạp
}) => {
  const now = new Date();

  // Thống kê theo phòng & theo rạp cho ngày đang chọn
  const statsByRoom = useMemo(() => {
    const map = {};
    dayShowtimes.forEach((st) => {
      const key = st.cinemaRoomUuid;
      if (!key) return;
      const item = (map[key] ||= {
        count: 0, selling: 0, draft: 0, conflict: 0, playing: 0, next: null,
      });
      item.count += 1;
      if (st.status === 'OPEN_FOR_BOOKING') item.selling += 1;
      if (st.status === 'DRAFT') item.draft += 1;
      if (conflicts?.has(st.uuid)) item.conflict += 1;
      if (isShowtimePlayingNow(st, now)) item.playing += 1;
      const start = new Date(st.startTime);
      if (start > now && st.status !== 'CANCELLED' && (!item.next || start < item.next)) {
        item.next = start;
      }
    });
    return map;
  }, [dayShowtimes, conflicts, now]);

  const statsByCinema = useMemo(() => {
    const map = {};
    dayShowtimes.forEach((st) => {
      const key = st.cinemaUuid || st.cinemaName;
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [dayShowtimes]);

  const roomStatus = (s) => {
    if (!s || s.count === 0) return { label: 'Còn trống', cls: 'is-free' };
    if (s.conflict > 0) return { label: 'Trùng giờ', cls: 'is-conflict' };
    if (s.playing > 0) return { label: 'Đang chiếu', cls: 'is-playing' };
    if (s.count >= 6) return { label: 'Đầy lịch', cls: 'is-full' };
    return { label: 'Đang hoạt động', cls: 'is-active' };
  };

  if (cinemas.length === 0) {
    return (
      <div className="stx-empty adm-empty">
        <Building2 className="stx-empty__icon" />
        <p className="stx-empty__title">Chưa có rạp chiếu nào</p>
        <p className="stx-empty__sub">Tạo rạp và phòng chiếu trong mục Quản lý rạp trước khi xếp lịch.</p>
      </div>
    );
  }

  return (
    <div className="strp-grid">
      {cinemas.map((cinema, ci) => {
        const rooms = roomsByCinema[cinema.uuid];
        const cinemaCount = statsByCinema[cinema.uuid] || 0;
        return (
          <section
            key={cinema.uuid}
            className="strp-cinema st-rise"
            style={{ animationDelay: `${Math.min(ci * 70, 350)}ms` }}
          >
            <header className="strp-cinema__head">
              <span className="strp-cinema__icon">
                <Building2 className="w-5 h-5" />
              </span>
              <div className="strp-cinema__info">
                <h3 className="strp-cinema__name">{cinema.name}</h3>
                {cinema.address && <p className="strp-cinema__addr">{cinema.address}</p>}
              </div>
              <div className="strp-cinema__side">
                <span className={`strp-cinema__badge ${String(cinema.status).toUpperCase() === 'ACTIVE' ? 'is-active' : 'is-muted'}`}>
                  {String(cinema.status).toUpperCase() === 'ACTIVE' ? 'Active' : cinema.status || '—'}
                </span>
                <button
                  type="button"
                  className="strp-cinema__all"
                  onClick={() => onSelectRoom(cinema, null)}
                  title="Điều phối tất cả phòng của rạp này"
                >
                  <Layers className="w-3 h-3" /> Cả rạp ({cinemaCount})
                </button>
              </div>
            </header>

            <div className="strp-rooms">
              {isLoadingRooms ? (
                <div className="strp-room strp-room--loading">
                  <span className="adm-skeleton" style={{ width: '55%', height: 12, borderRadius: 6 }} />
                  <span className="adm-skeleton" style={{ width: '30%', height: 10, borderRadius: 6 }} />
                </div>
              ) : !rooms || rooms.length === 0 ? (
                <div className="strp-room strp-room--empty">Rạp chưa có phòng chiếu hoạt động</div>
              ) : (
                rooms.map((room, ri) => {
                  const s = statsByRoom[room.uuid];
                  const status = roomStatus(s);
                  return (
                    <button
                      key={room.uuid}
                      type="button"
                      className={`strp-room st-rise ${status.cls}`}
                      style={{ animationDelay: `${Math.min(ci * 70 + (ri + 1) * 55, 500)}ms` }}
                      onClick={() => onSelectRoom(cinema, room)}
                    >
                      <span className="strp-room__icon">
                        <MonitorPlay className="w-4 h-4" />
                      </span>
                      <span className="strp-room__info">
                        <span className="strp-room__name">
                          {room.name}
                          <em>({roomTypeLabel(room.roomType)})</em>
                        </span>
                        <span className="strp-room__meta">
                          {room.capacity != null && (
                            <>
                              <Users className="w-3 h-3" /> {room.capacity} ghế
                            </>
                          )}
                          {s?.count > 0 && <span>· {s.count} suất</span>}
                          {s?.next && <span>· kế tiếp {formatTimeOnly(s.next.toISOString())}</span>}
                        </span>
                      </span>
                      <span className="strp-room__state">
                        <span className="strp-room__state-label">Trạng thái</span>
                        <span className={`strp-room__state-value ${status.cls}`}>
                          {s?.conflict > 0 && <AlertTriangle className="w-3 h-3" />}
                          {status.label}
                        </span>
                      </span>
                      <ChevronRight className="strp-room__chev" />
                    </button>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ShowtimesRoomPicker;
