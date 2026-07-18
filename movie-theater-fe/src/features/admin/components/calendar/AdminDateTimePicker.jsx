import AdminDatePicker from './AdminDatePicker';
import AdminTimePicker from './AdminTimePicker';
import { joinDateTimeLocal, splitDateTimeLocal } from './dateUtils';
import './AdminCalendar.css';

/**
 * Date + time field using AdminDatePicker + AdminTimePicker (24h).
 * Value format matches <input type="datetime-local">: YYYY-MM-DDTHH:mm
 */
export default function AdminDateTimePicker({
  value = '',
  onChange,
  label,
  dateLabel,
  timeLabel = 'Giờ',
  minDate,
  maxDate,
  disabled = false,
  clearable = true,
  size = 'md',
  className = '',
  required = false,
}) {
  const { date, time } = splitDateTimeLocal(value);

  const setDate = (nextDate) => {
    if (!nextDate) {
      onChange?.('');
      return;
    }
    onChange?.(joinDateTimeLocal(nextDate, time || '00:00'));
  };

  const setTime = (nextTime) => {
    if (!nextTime) {
      if (!date) {
        onChange?.('');
        return;
      }
      onChange?.(joinDateTimeLocal(date, '00:00'));
      return;
    }
    if (!date) {
      onChange?.(joinDateTimeLocal('', nextTime));
      return;
    }
    onChange?.(joinDateTimeLocal(date, nextTime));
  };

  const resolvedDateLabel = dateLabel ?? (label ? 'Ngày' : undefined);
  const resolvedTimeLabel = timeLabel ?? 'Giờ';

  return (
    <div className={className}>
      {label ? <label className="adm-datepicker__label">{label}</label> : null}
      <div className="adm-datetime">
        <AdminDatePicker
          label={resolvedDateLabel}
          value={date}
          onChange={setDate}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          clearable={clearable}
          size={size}
          placeholder="Chọn ngày"
          panelAlign="left"
        />
        <AdminTimePicker
          label={resolvedTimeLabel}
          value={time}
          onChange={setTime}
          disabled={disabled || !date}
          clearable={false}
          size={size}
          required={required}
          placeholder="HH:mm"
          panelAlign="right"
        />
      </div>
    </div>
  );
}
