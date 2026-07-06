import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Film,
  MapPin,
  Milestone,
  Search,
  X,
} from 'lucide-react';
import { CounterSelectDropdown } from '../../../counter/components/CounterSelectDropdown';

const toDateKey = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toTimeSlot = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (dateKey) => {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

const formatShowtimeParts = (iso) => {
  if (!iso) return { time: '—', date: '—' };
  const date = new Date(iso);
  return {
    time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };
};

const applyFilters = (list, filters, keys) => {
  let pool = list;
  if (keys.includes('cinema') && filters.cinema) {
    pool = pool.filter((s) => s.cinemaName === filters.cinema);
  }
  if (keys.includes('room') && filters.room) {
    pool = pool.filter((s) => s.roomName === filters.room);
  }
  if (keys.includes('date') && filters.date) {
    pool = pool.filter((s) => toDateKey(s.startTime) === filters.date);
  }
  if (keys.includes('timeSlot') && filters.timeSlot) {
    pool = pool.filter((s) => toTimeSlot(s.startTime) === filters.timeSlot);
  }
  return pool;
};

const StaffShowtimePicker = ({
  showtimes = [],
  filteredShowtimes = [],
  selectedUuid,
  onSelect,
  loadError = '',
  showtimesWithSales = 0,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters = false,
  ShowtimePoster,
}) => {
  const cinemaOptions = useMemo(() => {
    const names = [...new Set(showtimes.map((s) => s.cinemaName).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes]);

  const roomOptions = useMemo(() => {
    const pool = applyFilters(showtimes, filters, ['cinema']);
    const names = [...new Set(pool.map((s) => s.roomName).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes, filters.cinema]);

  const dateOptions = useMemo(() => {
    const pool = applyFilters(showtimes, filters, ['cinema', 'room']);
    const keys = [...new Set(pool.map((s) => toDateKey(s.startTime)).filter(Boolean))];
    return keys.sort();
  }, [showtimes, filters.cinema, filters.room]);

  const timeSlotOptions = useMemo(() => {
    const pool = applyFilters(showtimes, filters, ['cinema', 'room', 'date']);
    const slots = [...new Set(pool.map((s) => toTimeSlot(s.startTime)).filter(Boolean))];
    return slots.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes, filters.cinema, filters.room, filters.date]);

  const movieSuggestions = useMemo(() => {
    const pool = applyFilters(showtimes, filters, ['cinema', 'room', 'date', 'timeSlot']);
    const titles = [...new Set(pool.map((s) => s.movieTitle).filter(Boolean))];
    return titles.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimes, filters.cinema, filters.room, filters.date, filters.timeSlot]);

  return (
    <section className="staff-control__panel staff-control__panel--showtimes-top">
      <div className="staff-control__panel-head">
        <h2 className="staff-control__panel-title">
          <Film className="w-3.5 h-3.5" />
          Suất đang vận hành
        </h2>
        <div className="staff-control__panel-head-actions">
          {showtimesWithSales > 0 && (
            <span className="staff-control__panel-badge">{showtimesWithSales} suất có vé</span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              className="staff-control__filter-clear"
              onClick={onClearFilters}
            >
              <X className="w-3 h-3" />
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {showtimesWithSales > 0 && (
        <p className="staff-control__sales-hint">
          Chọn suất có vé để xem sơ đồ ghế trực tiếp bên dưới.
        </p>
      )}

      {showtimes.length > 0 && (
        <div className="staff-control__filters staff-control__filters--cascade">
          <div className="staff-control__filter-step">
            <span className="staff-control__filter-label">
              <Building2 className="w-3 h-3" />
              Rạp
            </span>
            <CounterSelectDropdown
              id="staff-control-cinema"
              variant="header"
              leadingIcon={Building2}
              value={filters.cinema}
              options={[
                { value: '', label: 'Tất cả rạp' },
                ...cinemaOptions.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="Tất cả rạp"
              emptyMessage="Chưa có rạp"
              onChange={(value) => onFilterChange('cinema', value)}
            />
          </div>

          <div className="staff-control__filter-step">
            <span className="staff-control__filter-label">
              <Milestone className="w-3 h-3" />
              Phòng
            </span>
            <CounterSelectDropdown
              id="staff-control-room"
              variant="header"
              leadingIcon={Milestone}
              value={filters.room}
              options={[
                { value: '', label: 'Tất cả phòng' },
                ...roomOptions.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="Tất cả phòng"
              emptyMessage="Không có phòng"
              disabled={!roomOptions.length}
              onChange={(value) => onFilterChange('room', value)}
            />
          </div>

          <div className="staff-control__filter-step">
            <span className="staff-control__filter-label">
              <Calendar className="w-3 h-3" />
              Ngày chiếu
            </span>
            <CounterSelectDropdown
              id="staff-control-date"
              variant="header"
              leadingIcon={Calendar}
              value={filters.date}
              options={[
                { value: '', label: 'Tất cả ngày' },
                ...dateOptions.map((key) => ({ value: key, label: formatDateLabel(key) })),
              ]}
              placeholder="Tất cả ngày"
              emptyMessage="Không có ngày"
              disabled={!dateOptions.length}
              onChange={(value) => onFilterChange('date', value)}
            />
          </div>

          <div className="staff-control__filter-step">
            <span className="staff-control__filter-label">
              <Clock className="w-3 h-3" />
              Suất chiếu
            </span>
            <CounterSelectDropdown
              id="staff-control-timeslot"
              variant="header"
              leadingIcon={Clock}
              value={filters.timeSlot}
              options={[
                { value: '', label: 'Tất cả suất' },
                ...timeSlotOptions.map((slot) => ({ value: slot, label: slot })),
              ]}
              placeholder="Tất cả suất"
              emptyMessage="Không có suất"
              disabled={!timeSlotOptions.length}
              onChange={(value) => onFilterChange('timeSlot', value)}
            />
          </div>

          <label className="staff-control__filter-step staff-control__filter-step--movie">
            <span className="staff-control__filter-label">
              <Search className="w-3 h-3" />
              Phim
            </span>
            <input
              type="search"
              className="staff-control__input"
              placeholder="Nhập tên phim..."
              value={filters.movie}
              onChange={(e) => onFilterChange('movie', e.target.value)}
              list="staff-showtime-movies"
            />
            <datalist id="staff-showtime-movies">
              {movieSuggestions.map((title) => (
                <option key={title} value={title} />
              ))}
            </datalist>
          </label>
        </div>
      )}

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
          <p>Không có suất khớp bộ lọc. Thử đổi rạp, phòng, ngày hoặc khung giờ.</p>
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

export { toDateKey, toTimeSlot };
export default StaffShowtimePicker;
