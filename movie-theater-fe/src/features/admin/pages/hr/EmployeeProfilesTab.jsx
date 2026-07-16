import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Users } from 'lucide-react';
import { AdminModal, PrimaryButton, StatusBadge, AdminTableShell } from '../../components';
import { adminInputClass, adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import { formatMoney } from './hrUtils';

const EMPLOYMENT_TYPES = [
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
];

const employmentLabel = (value) =>
  EMPLOYMENT_TYPES.find((t) => t.value === value)?.label || value || '—';

const EmployeeProfilesTab = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.getEmployeeProfiles();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải hồ sơ lương.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="hr-state">
        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        <p>Đang tải...</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="hr-state">
        <Users className="h-9 w-9 text-slate-500" />
        <p>Chưa có nhân viên nào.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="hr-muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Cấu hình đơn giá theo giờ và hệ số OT cho từng nhân viên. Nhân viên chưa có hồ sơ sẽ dùng
        đơn giá 0đ khi tính lương.
      </p>
      <AdminTableShell>
        <table className="adm-table hr-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Loại HĐ</th>
              <th>Đơn giá/giờ</th>
              <th>OT ngày thường</th>
              <th>OT cuối tuần</th>
              <th>OT ngày lễ</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.userId}>
                <td>
                  <div className="hr-strong">{p.fullName || '—'}</div>
                  <div className="hr-muted" style={{ fontSize: 11 }}>{p.email}</div>
                </td>
                <td>{employmentLabel(p.employmentType)}</td>
                <td className="hr-num hr-strong">{p.hasProfile ? formatMoney(p.hourlyRate) : '—'}</td>
                <td className="hr-num">×{Number(p.otMultiplierWeekday).toFixed(2)}</td>
                <td className="hr-num">×{Number(p.otMultiplierWeekend).toFixed(2)}</td>
                <td className="hr-num">×{Number(p.otMultiplierHoliday).toFixed(2)}</td>
                <td>
                  {!p.hasProfile ? (
                    <StatusBadge variant="muted">Chưa cấu hình</StatusBadge>
                  ) : p.active ? (
                    <StatusBadge variant="success">Đang áp dụng</StatusBadge>
                  ) : (
                    <StatusBadge variant="danger">Tạm ngưng</StatusBadge>
                  )}
                </td>
                <td>
                  <div className="hr-row-actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost px-2.5 py-1.5 rounded-md cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {p.hasProfile ? 'Sửa' : 'Thiết lập'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {editing && (
        <ProfileModal
          profile={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
};

const HOURLY_RATE_MAX = 100000000;
const OT_MULTIPLIER_MIN = 1;
const OT_MULTIPLIER_MAX = 5;

const parseNumber = (value) => {
  if (typeof value === 'string' && value.trim() === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const validateHourlyRate = (value) => {
  const n = parseNumber(value);
  if (Number.isNaN(n)) return 'Vui lòng nhập đơn giá hợp lệ.';
  if (n <= 0) return 'Đơn giá theo giờ phải lớn hơn 0.';
  if (n > HOURLY_RATE_MAX) return 'Đơn giá theo giờ quá lớn, vui lòng kiểm tra lại.';
  return null;
};

const validateMultiplier = (value, label) => {
  const n = parseNumber(value);
  if (Number.isNaN(n)) return `${label} không hợp lệ.`;
  if (n < OT_MULTIPLIER_MIN) return `${label} phải ≥ ${OT_MULTIPLIER_MIN}.`;
  if (n > OT_MULTIPLIER_MAX) return `${label} tối đa là ${OT_MULTIPLIER_MAX}.`;
  return null;
};

function ProfileModal({ profile, onClose, onSaved }) {
  const confirm = useConfirm();
  const [hourlyRate, setHourlyRate] = useState(
    profile.hasProfile ? String(profile.hourlyRate ?? '') : '',
  );
  const [weekday, setWeekday] = useState(String(profile.otMultiplierWeekday ?? '1.50'));
  const [weekend, setWeekend] = useState(String(profile.otMultiplierWeekend ?? '2.00'));
  const [holiday, setHoliday] = useState(String(profile.otMultiplierHoliday ?? '2.00'));
  const [employmentType, setEmploymentType] = useState(profile.employmentType || 'PART_TIME');
  const [active, setActive] = useState(profile.active !== false);
  const [note, setNote] = useState(profile.note || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    const rateError = validateHourlyRate(hourlyRate);
    if (rateError) next.hourlyRate = rateError;
    const weekdayError = validateMultiplier(weekday, 'Hệ số OT ngày thường');
    if (weekdayError) next.weekday = weekdayError;
    const weekendError = validateMultiplier(weekend, 'Hệ số OT cuối tuần');
    if (weekendError) next.weekend = weekendError;
    const holidayError = validateMultiplier(holiday, 'Hệ số OT ngày lễ');
    if (holidayError) next.holiday = holidayError;
    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notificationService.warning('Vui lòng kiểm tra lại thông tin hồ sơ lương.');
      return;
    }
    const ok = await confirm({
      title: 'Lưu hồ sơ lương',
      message: 'Cập nhật hồ sơ lương cho nhân viên này?',
      highlight: profile.fullName || profile.email,
      detail: !active ? 'Nhân viên sẽ không được tính lương theo hồ sơ này.' : '',
      confirmLabel: 'Lưu hồ sơ',
      variant: !active ? 'danger' : 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      await hrService.upsertEmployeeProfile(profile.userId, {
        hourlyRate: parseNumber(hourlyRate),
        otMultiplierWeekday: parseNumber(weekday),
        otMultiplierWeekend: parseNumber(weekend),
        otMultiplierHoliday: parseNumber(holiday),
        employmentType,
        active,
        note: note.trim() || null,
      });
      notificationService.success('Đã lưu hồ sơ lương.');
      await onSaved();
    } catch (err) {
      notificationService.error(err?.message || 'Lưu hồ sơ thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Hồ sơ lương nhân viên"
      subtitle={`${profile.fullName || profile.email}`}
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm" onClick={onClose}>
            Hủy
          </button>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Lưu hồ sơ</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="hr-field">
          <label className="hr-field__label">Đơn giá theo giờ (đ)</label>
          <input
            type="number"
            min="0"
            step="1000"
            className={adminInputClass}
            value={hourlyRate}
            placeholder="Ví dụ: 50000"
            aria-invalid={Boolean(errors.hourlyRate)}
            onChange={(e) => {
              setHourlyRate(e.target.value);
              setErrors((prev) => ({ ...prev, hourlyRate: undefined }));
            }}
          />
          {errors.hourlyRate && <p className="hr-field__error">{errors.hourlyRate}</p>}
        </div>
        <div className="hr-field">
          <label className="hr-field__label">Hệ số OT (nhân vào lương giờ khi tăng ca)</label>
          <div className="hr-inline" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div className="hr-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="hr-field__sublabel">Ngày thường</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                className={adminInputClass}
                value={weekday}
                aria-invalid={Boolean(errors.weekday)}
                onChange={(e) => {
                  setWeekday(e.target.value);
                  setErrors((prev) => ({ ...prev, weekday: undefined }));
                }}
              />
              {errors.weekday && <p className="hr-field__error">{errors.weekday}</p>}
            </div>
            <div className="hr-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="hr-field__sublabel">Cuối tuần</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                className={adminInputClass}
                value={weekend}
                aria-invalid={Boolean(errors.weekend)}
                onChange={(e) => {
                  setWeekend(e.target.value);
                  setErrors((prev) => ({ ...prev, weekend: undefined }));
                }}
              />
              {errors.weekend && <p className="hr-field__error">{errors.weekend}</p>}
            </div>
            <div className="hr-field" style={{ flex: 1, minWidth: 0 }}>
              <label className="hr-field__sublabel">Ngày lễ</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                className={adminInputClass}
                value={holiday}
                aria-invalid={Boolean(errors.holiday)}
                onChange={(e) => {
                  setHoliday(e.target.value);
                  setErrors((prev) => ({ ...prev, holiday: undefined }));
                }}
              />
              {errors.holiday && <p className="hr-field__error">{errors.holiday}</p>}
            </div>
          </div>
        </div>
        <div className="hr-field">
          <AdminSelectDropdown
            label="Loại hợp đồng"
            value={employmentType}
            options={EMPLOYMENT_TYPES}
            onChange={setEmploymentType}
          />
        </div>
        <label className="hr-inline" style={{ cursor: 'pointer', gap: 8 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>Đang áp dụng (tính lương)</span>
        </label>
        <div className="hr-field">
          <label className="hr-field__label">Ghi chú</label>
          <textarea className={adminTextareaClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </AdminModal>
  );
}

export default EmployeeProfilesTab;
