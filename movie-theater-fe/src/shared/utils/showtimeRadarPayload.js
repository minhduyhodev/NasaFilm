export const RADAR_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, '0')}:00`,
}));

export const buildShowtimeRadarPayload = ({
  enabled,
  includeFavorites,
  selectedGenres,
  timeSlotStartHour,
  timeSlotEndHour,
}) => ({
  enabled,
  includeFavorites,
  genreUuids: (selectedGenres ?? []).map(String),
  timeSlotStartHour: timeSlotStartHour === '' || timeSlotStartHour == null
    ? null
    : Number(timeSlotStartHour),
  timeSlotEndHour: timeSlotEndHour === '' || timeSlotEndHour == null
    ? null
    : Number(timeSlotEndHour),
});

export const formatRadarHourRange = (startHour, endHour) => {
  if (startHour == null && endHour == null) return 'Bất kỳ';
  const start = startHour != null ? `${String(startHour).padStart(2, '0')}:00` : '—';
  const end = endHour != null ? `${String(endHour).padStart(2, '0')}:00` : '—';
  return `${start} – ${end}`;
};
