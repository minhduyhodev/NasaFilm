import { useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Film,
  MapPin,
  Milestone,
} from 'lucide-react';
import { CounterSelectDropdown } from '../../../counter/components/CounterSelectDropdown';
import { resolveMediaUrl } from '../../../../shared/utils/mediaUrlUtils';
import {
  applyShowtimeFilters,
  formatDateLabel,
  toDateKey,
  toTimeSlot,
} from '../../../../shared/utils/showtimeFilterUtils';

const formatShowtimeParts = (iso) => {
  if (!iso) return { time: '—', date: '—' };
  const date = new Date(iso);
  return {
    time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };
};

const staffFilterShape = (filters) => ({
  cinemaName: filters.cinema,
  roomName: filters.room,
  date: filters.date,
  timeSlot: filters.timeSlot,
  movieUuid: filters.movieUuid,
});

const StaffShowtimePicker = ({
  showtimes = [],
  filteredShowtimes = [],
  selectedUuid,
  onSelect,
  loadError = '',
  showtimesWithSales = 0,
  filters,
  onFilterChange,
  ShowtimePoster,
}) => {
  const hasCinema = Boolean(filters.cinema);

  const cinemaOptions = useMemo(() => {
    const names = [...new Set(showtimes.map((s) => s.cinemaName).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes]);

  // Chỉ hiện phòng sau khi chọn rạp (giống CounterLocationToolbar)
  const roomOptions = useMemo(() => {
    if (!filters.cinema) return [];
    const pool = applyShowtimeFilters(showtimes, staffFilterShape(filters), ['cinema']);
    const names = [...new Set(pool.map((s) => s.roomName).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes, filters.cinema]);

  // Ngày / suất / phim chỉ mở sau khi chọn rạp
  const dateOptions = useMemo(() => {
    if (!filters.cinema) return [];
    const pool = applyShowtimeFilters(showtimes, staffFilterShape(filters), ['cinema', 'roomName']);
    const keys = [...new Set(pool.map((s) => toDateKey(s.startTime)).filter(Boolean))];
    return keys.sort();
  }, [showtimes, filters.cinema, filters.room]);

  const timeSlotOptions = useMemo(() => {
    if (!filters.cinema) return [];
    const pool = applyShowtimeFilters(showtimes, staffFilterShape(filters), ['cinema', 'roomName', 'date']);
    const slots = [...new Set(pool.map((s) => toTimeSlot(s.startTime)).filter(Boolean))];
    return slots.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes, filters.cinema, filters.room, filters.date]);

  const movieOptions = useMemo(() => {
    if (!filters.cinema) {
      return [{ value: '', label: 'Phim' }];
    }
    const pool = applyShowtimeFilters(
      showtimes,
      staffFilterShape(filters),
      ['cinema', 'roomName', 'date', 'timeSlot'],
    );
    const byUuid = new Map();
    pool.forEach((s) => {
      if (!s.movieUuid || byUuid.has(s.movieUuid)) return;
      byUuid.set(s.movieUuid, {
        value: s.movieUuid,
        label: s.movieTitle || 'Phim',
        image: s.posterUrl ? resolveMediaUrl(s.posterUrl, 120) : '',
      });
    });
    return [
      { value: '', label: 'Phim' },
      ...[...byUuid.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    ];
  }, [showtimes, filters.cinema, filters.room, filters.date, filters.timeSlot]);

  return (
    <section className="staff-control__panel staff-control__panel--showtimes-top staff-control__panel--showtimes-daily">
      <div className="counter-pos__daily-head staff-control__daily-head">
        <div className="staff-control__daily-title-wrap">
          <div className="staff-control__daily-title-row">
            <h2 className="counter-pos__daily-title staff-control__daily-title">Suất đang vận hành</h2>
            {showtimesWithSales > 0 && (
              <span className="staff-control__panel-badge">{showtimesWithSales} suất có vé</span>
            )}
          </div>
          {showtimesWithSales > 0 && (
            <p className="staff-control__sales-hint staff-control__sales-hint--inline">
              Chọn suất có vé để xem sơ đồ ghế trực tiếp bên dưới.
            </p>
          )}
        </div>
        <div className="counter-pos__daily-head-actions staff-control__daily-head-actions">
          {showtimes.length > 0 && (
            <div className="counter-pos__daily-filters staff-control__daily-filters">
              <CounterSelectDropdown
                id="staff-control-cinema"
                variant="header"
                leadingIcon={Building2}
                iconClassName="counter-header__dropdown-icon--cinema"
                value={filters.cinema}
                options={[
                  { value: '', label: 'Rạp' },
                  ...cinemaOptions.map((name) => ({ value: name, label: name })),
                ]}
                placeholder="Rạp"
                emptyMessage="Chưa có rạp"
                onChange={(value) => onFilterChange('cinema', value)}
              />

              <CounterSelectDropdown
                id="staff-control-room"
                variant="header"
                leadingIcon={Milestone}
                iconClassName="counter-header__dropdown-icon--room"
                value={filters.room}
                options={[
                  { value: '', label: 'Phòng chiếu' },
                  ...roomOptions.map((name) => ({ value: name, label: name })),
                ]}
                placeholder="Phòng chiếu"
                emptyMessage="Không có phòng"
                disabled={!hasCinema || roomOptions.length === 0}
                onChange={(value) => onFilterChange('room', value)}
              />

              <CounterSelectDropdown
                id="staff-control-date"
                variant="header"
                leadingIcon={Calendar}
                iconClassName="counter-header__dropdown-icon--date"
                value={filters.date}
                options={[
                  { value: '', label: 'Ngày' },
                  ...dateOptions.map((key) => ({ value: key, label: formatDateLabel(key) })),
                ]}
                placeholder="Ngày"
                emptyMessage="Không có ngày"
                disabled={!hasCinema || dateOptions.length === 0}
                onChange={(value) => onFilterChange('date', value)}
              />

              <CounterSelectDropdown
                id="staff-control-timeslot"
                variant="header"
                leadingIcon={Clock}
                iconClassName="counter-header__dropdown-icon--time"
                value={filters.timeSlot}
                options={[
                  { value: '', label: 'Suất' },
                  ...timeSlotOptions.map((slot) => ({ value: slot, label: slot })),
                ]}
                placeholder="Suất"
                emptyMessage="Không có suất"
                disabled={!hasCinema || timeSlotOptions.length === 0}
                onChange={(value) => onFilterChange('timeSlot', value)}
              />

              <CounterSelectDropdown
                id="staff-control-movie"
                variant="header"
                leadingIcon={Film}
                iconClassName="counter-header__dropdown-icon--movie"
                value={filters.movieUuid}
                options={movieOptions}
                placeholder="Phim"
                emptyMessage="Không có phim"
                disabled={!hasCinema || !movieOptions.some((o) => o.value)}
                onChange={(value) => onFilterChange('movieUuid', value)}
              />
            </div>
          )}
        </div>
      </div>

      {showtimes.length === 0 ? (
        <div className="staff-control__empty">
          {loadError ? (
            <p>{loadError}</p>
          ) : (
            <p>Không có suất mở bán trong 4 ngày tới.</p>
          )}
        </div>
      ) : filteredShowtimes.length === 0 ? (
        <div className="staff-control__empty">
          <p>Không có suất khớp bộ lọc. Thử đổi rạp, phòng, ngày, suất hoặc phim.</p>
        </div>
      ) : (
        <div className="staff-control__showtime-strip">
          {filteredShowtimes.map((showtime, index) => {
            const isActive = showtime.showtimeUuid === selectedUuid;
            const hasSales = (showtime.soldSeats ?? 0) > 0;
            const { time, date } = formatShowtimeParts(showtime.startTime);
            return (
              <button
                key={showtime.showtimeUuid}
                type="button"
                style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                className={`staff-control__showtime-card staff-control__showtime-card--strip ${isActive ? 'staff-control__showtime-card--active' : ''} ${showtime.almostFull ? 'staff-control__showtime-card--alert' : ''} ${hasSales ? 'staff-control__showtime-card--has-sales' : ''}`}
                onClick={() => onSelect(showtime.showtimeUuid)}
              >
                <div className="staff-control__showtime-poster-wrap">
                  <ShowtimePoster posterUrl={showtime.posterUrl} title={showtime.movieTitle} />
                  {hasSales && (
                    <span className="staff-control__poster-live">Đang bán</span>
                  )}
                </div>
                <div className="staff-control__showtime-content">
                  <h3 className="staff-control__showtime-movie">{showtime.movieTitle}</h3>
                  <div className="staff-control__showtime-chips">
                    <span className="staff-control__chip staff-control__chip--time">
                      <Clock className="w-3 h-3" />
                      {time}
                    </span>
                    <span className="staff-control__chip">{date}</span>
                  </div>
                  <p className="staff-control__showtime-meta">
                    <MapPin className="w-3 h-3 inline opacity-60" />
                    {showtime.cinemaName} · {showtime.roomName}
                  </p>
                  <div className="staff-control__occupancy">
                    <div className="staff-control__occupancy-bar">
                      <div
                        className={`staff-control__occupancy-fill ${showtime.almostFull ? 'staff-control__occupancy-fill--danger' : ''}`}
                        style={{ width: `${Math.min(100, showtime.occupancyPercent)}%` }}
                      />
                    </div>
                    <span className="staff-control__occupancy-pct">{showtime.occupancyPercent}%</span>
                  </div>
                  {hasSales && (
                    <div className="staff-control__sold-badge">
                      {showtime.soldSeats} ghế đã bán
                    </div>
                  )}
                  {showtime.almostFull && (
                    <div className="staff-control__alert-inline">
                      <AlertTriangle className="w-3 h-3" />
                      Sắp full
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filteredShowtimes.length > 0 && (
        <p className="staff-control__strip-summary">
          Hiển thị <strong>{filteredShowtimes.length}</strong> / {showtimes.length} suất
        </p>
      )}
    </section>
  );
};

export { toDateKey, toTimeSlot } from '../../../../shared/utils/showtimeFilterUtils';
export default StaffShowtimePicker;
