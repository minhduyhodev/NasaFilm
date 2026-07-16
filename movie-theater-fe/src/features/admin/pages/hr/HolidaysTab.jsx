import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import { AdminModal, PrimaryButton, AdminTableShell, AdminDatePicker } from '../../components';
import { adminInputClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import { formatDate, todayIso } from './hrUtils';

const now = new Date();

const HolidaysTab = () => {
  const [year, setYear] = useState(now.getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.getHolidays(year);
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải ngày lễ.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (holiday) => {
    const ok = await confirm({
      title: 'Xóa ngày lễ',
      message: 'Bạn có chắc muốn xóa ngày lễ này không?',
      highlight: `${holiday.name} · ${formatDate(holiday.holidayDate)}`,
      detail: 'Hệ số OT ngày lễ sẽ không còn áp dụng cho ngày này.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(holiday.uuid);
    try {
      await hrService.deleteHoliday(holiday.uuid);
      notificationService.success('Đã xóa ngày lễ.');
      await load();
    } catch (err) {
      notificationService.error(err?.message || 'Xóa ngày lễ thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: y, label: String(y) };
  });

  return (
    <div>
      <div className="hr-filters" style={{ justifyContent: 'space-between' }}>
        <div className="hr-field" style={{ minWidth: 140 }}>
          <AdminSelectDropdown label="Năm" value={year} options={yearOptions} onChange={setYear} size="sm" />
        </div>
        <PrimaryButton onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm ngày lễ
        </PrimaryButton>
      </div>

      <p className="hr-muted" style={{ fontSize: 13, marginBottom: 16 }}>
        OT trong ngày lễ sẽ áp dụng hệ số ngày lễ của nhân viên, hoặc hệ số ghi đè nếu được thiết lập.
        Cuối tuần (T7, CN) đã tự động được tính là ngày cuối tuần.
      </p>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải...</p>
        </div>
      ) : holidays.length === 0 ? (
        <div className="hr-state">
          <CalendarDays className="h-9 w-9 text-slate-500" />
          <p>Chưa có ngày lễ nào trong năm {year}.</p>
        </div>
      ) : (
        <AdminTableShell>
          <table className="adm-table hr-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Tên ngày lễ</th>
                <th>Hệ số OT ghi đè</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.uuid}>
                  <td className="hr-num hr-strong">{formatDate(h.holidayDate)}</td>
                  <td>{h.name}</td>
                  <td className="hr-num">{h.multiplierOverride ? `×${Number(h.multiplierOverride).toFixed(2)}` : 'Theo hồ sơ'}</td>
                  <td>
                    <div className="hr-row-actions">
                      <button
                        type="button"
                        className="cursor-pointer"
                        style={{ background: 'none', border: 'none', color: '#f87171', padding: 4 }}
                        title="Xóa"
                        disabled={deletingId === h.uuid}
                        onClick={() => handleDelete(h)}
                      >
                        {deletingId === h.uuid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}

      {addOpen && (
        <AddHolidayModal
          onClose={() => setAddOpen(false)}
          onSaved={async () => {
            setAddOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
};

function AddHolidayModal({ onClose, onSaved }) {
  const [date, setDate] = useState(todayIso());
  const [name, setName] = useState('');
  const [multiplier, setMultiplier] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!date || !name.trim()) {
      notificationService.warning('Vui lòng nhập ngày và tên ngày lễ.');
      return;
    }
    setSaving(true);
    try {
      await hrService.createHoliday({
        holidayDate: date,
        name: name.trim(),
        multiplierOverride: multiplier ? Number(multiplier) : null,
      });
      notificationService.success('Đã thêm ngày lễ.');
      await onSaved();
    } catch (err) {
      notificationService.error(err?.message || 'Thêm ngày lễ thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Thêm ngày lễ"
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm" onClick={onClose}>
            Hủy
          </button>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Thêm</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="hr-field">
          <AdminDatePicker label="Ngày" value={date} onChange={setDate} />
        </div>
        <div className="hr-field">
          <label className="hr-field__label">Tên ngày lễ</label>
          <input
            type="text"
            className={adminInputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Quốc khánh 2/9"
          />
        </div>
        <div className="hr-field">
          <label className="hr-field__label">Hệ số OT ghi đè (tuỳ chọn)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            className={adminInputClass}
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            placeholder="Bỏ trống để dùng hệ số ngày lễ của hồ sơ"
          />
        </div>
      </div>
    </AdminModal>
  );
}

export default HolidaysTab;
