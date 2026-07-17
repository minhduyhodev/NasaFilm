import AdminDatePicker from './AdminDatePicker';
import { adminInputClass } from '../adminFormStyles';
import { joinDateTimeLocal, splitDateTimeLocal } from './dateUtils';
import './AdminCalendar.css';

/**
 * Date + time field using AdminDatePicker + styled time input.
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
    if (!date) {
      // Keep empty until a date is chosen; still allow typing time after.
      onChange?.(joinDateTimeLocal('', nextTime));
      return;
    }
    onChange?.(joinDateTimeLocal(date, nextTime));
  };

  return (
    <div className={className}>
      {label ? <label className="adm-datepicker__label">{label}</label> : null}
      <div className="adm-datetime">
        <AdminDatePicker
          label={dateLabel}
          value={date}
          onChange={setDate}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          clearable={clearable}
          size={size}
          placeholder="Chọn ngày"
        />
        <div className="adm-datetime__time">
          {timeLabel ? <label className="adm-datepicker__label">{timeLabel}</label> : null}
          <input
            type="time"
            className={`${adminInputClass} adm-datetime__time-input${size === 'sm' ? ' adm-datetime__time-input--sm' : ''}`}
            value={time}
            disabled={disabled}
            required={required}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
