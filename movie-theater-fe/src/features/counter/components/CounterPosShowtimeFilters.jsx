import { useMemo } from 'react';
import { Calendar, Clock, Film } from 'lucide-react';
import { CounterSelectDropdown } from './CounterSelectDropdown';
import CounterLocationToolbar from './CounterLocationToolbar';
import {
  applyShowtimeFilters,
  formatDateLabel,
  toDateKey,
  toTimeSlot,
} from '../../../shared/utils/showtimeFilterUtils';

/**
 * Compact filter row for POS Daily Showtimes:
 * Cinema · Room · Date · Time · Movie — matches reference header layout.
 */
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
    <div className="counter-pos__daily-filters">
      <CounterLocationToolbar
        className="counter-location-toolbar--daily"
        cinemaLabel="Rạp"
        roomLabel="Phòng chiếu"
        allowEmptyCinema
        cinemaEmptyLabel="Rạp"
        allowEmptyRoom
        roomEmptyLabel="Phòng chiếu"
      />

      <CounterSelectDropdown
        id="counter-pos-date"
        variant="header"
        label="Ngày"
        leadingIcon={Calendar}
        iconClassName="counter-header__dropdown-icon--date"
        value={filters.date}
        options={[
          { value: '', label: 'Ngày' },
          ...dateOptions.map((key) => ({
            value: key,
            label: formatDateLabel(key),
          })),
        ]}
        placeholder="Ngày"
        emptyMessage="Không có ngày"
        disabled={!dateOptions.length}
        onChange={(value) => onFilterChange('date', value)}
      />

      <CounterSelectDropdown
        id="counter-pos-timeslot"
        variant="header"
        label="Suất"
        leadingIcon={Clock}
        iconClassName="counter-header__dropdown-icon--time"
        value={filters.timeSlot}
        options={[
          { value: '', label: 'Suất' },
          ...timeSlotOptions.map((slot) => ({ value: slot, label: slot })),
        ]}
        placeholder="Suất"
        emptyMessage="Không có suất"
        disabled={!timeSlotOptions.length}
        onChange={(value) => onFilterChange('timeSlot', value)}
      />

      <CounterSelectDropdown
        id="counter-pos-movie"
        variant="header"
        label="Phim"
        leadingIcon={Film}
        iconClassName="counter-header__dropdown-icon--movie"
        value={filters.movieUuid}
        options={filteredMovieOptions}
        placeholder="Phim"
        emptyMessage="Không có phim"
        disabled={!filteredMovieOptions.some((o) => o.value)}
        onChange={(value) => onFilterChange('movieUuid', value)}
      />
    </div>
  );
};

export default CounterPosShowtimeFilters;
