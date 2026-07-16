import { useMemo } from 'react';
import { Building2, Calendar, Clock, Film } from 'lucide-react';
import { CounterSelectDropdown } from './CounterSelectDropdown';
import CounterLocationToolbar from './CounterLocationToolbar';
import {
  applyShowtimeFilters,
  formatDateLabel,
  toDateKey,
  toTimeSlot,
} from '../../../shared/utils/showtimeFilterUtils';

const CounterPosShowtimeFilters = ({
  showtimes = [],
  filters,
  roomUuid = '',
  onFilterChange,
  movieOptions = [],
}) => {
  const basePool = useMemo(
    () => applyShowtimeFilters(showtimes, { roomUuid }, ['room']),
    [showtimes, roomUuid],
  );

  const dateOptions = useMemo(() => {
    const keys = [...new Set(basePool.map((s) => toDateKey(s.startTime)).filter(Boolean))];
    return keys.sort();
  }, [basePool]);

  const timeSlotOptions = useMemo(() => {
    const pool = applyShowtimeFilters(basePool, filters, ['date']);
    const slots = [...new Set(pool.map((s) => toTimeSlot(s.startTime)).filter(Boolean))];
    return slots.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [basePool, filters.date]);

  const filteredMovieOptions = useMemo(() => {
    const pool = applyShowtimeFilters(basePool, filters, ['date', 'timeSlot']);
    const movieUuids = new Set(pool.map((s) => s.movieUuid).filter(Boolean));
    return movieOptions.filter((opt) => !opt.value || movieUuids.has(opt.value));
  }, [basePool, filters.date, filters.timeSlot, movieOptions]);

  return (
    <div className="staff-control__filters staff-control__filters--cascade staff-control__filters--pos">
        <div className="staff-control__filter-step staff-control__filter-step--location">
          <span className="staff-control__filter-label">
            <Building2 className="w-3 h-3" />
            Rạp & Phòng
          </span>
          <CounterLocationToolbar className="counter-location-toolbar--in-grid" />
        </div>

        <div className="staff-control__filter-step">
          <span className="staff-control__filter-label">
            <Calendar className="w-3 h-3" />
            Ngày chiếu
          </span>
          <CounterSelectDropdown
            id="counter-pos-date"
            variant="header"
            leadingIcon={Calendar}
            value={filters.date}
            options={[
              { value: '', label: 'Tất cả ngày' },
              ...dateOptions.map((key) => ({
                value: key,
                label: formatDateLabel(key),
              })),
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
            id="counter-pos-timeslot"
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

        <div className="staff-control__filter-step">
          <span className="staff-control__filter-label">
            <Film className="w-3 h-3" />
            Phim
          </span>
          <CounterSelectDropdown
            id="counter-pos-movie"
            variant="header"
            leadingIcon={Film}
            value={filters.movieUuid}
            options={filteredMovieOptions}
            placeholder="Tất cả phim"
            emptyMessage="Không có phim"
            disabled={!filteredMovieOptions.some((o) => o.value)}
            onChange={(value) => onFilterChange('movieUuid', value)}
          />
        </div>
    </div>
  );
};

export default CounterPosShowtimeFilters;
