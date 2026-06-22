import React, { useState, useEffect } from 'react';
import { cinemaService } from '../../../../shared/services/cinemaService';
import { notificationService } from '../../../../shared/services/notificationService';
import { systemConfigService } from '../../../../shared/services/systemConfigService';
import { getEnabledRoomTypes } from '../../../../shared/utils/systemConfig';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../adminFormStyles';
const ROOM_STATUSES = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'DISABLED', label: 'Vô hiệu' },
];

const emptyForm = {
  roomCode: '',
  name: '',
  roomType: 'STANDARD',
  capacity: 120,
  status: 'ACTIVE',
};

const CinemaRoomFormPanel = ({ cinemaUuid, cinemaName, onSuccess, onCancel }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [roomTypes, setRoomTypes] = useState(() => getEnabledRoomTypes());
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => {
        const enabled = getEnabledRoomTypes(cfg);
        setRoomTypes(enabled);
        if (enabled.length && !enabled.some((t) => t.value === form.roomType)) {
          setForm((p) => ({ ...p, roomType: enabled[0].value }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roomCode.trim() || !form.name.trim()) {
      notificationService.error('Vui lòng điền mã và tên phòng');
      return;
    }
    setIsSaving(true);
    try {
      await cinemaService.createRoom(cinemaUuid, {
        roomCode: form.roomCode.trim(),
        name: form.name.trim(),
        roomType: form.roomType,
        capacity: Number(form.capacity) || 0,
        status: form.status,
      });
      notificationService.success('Tạo phòng chiếu thành công');
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {cinemaName && (
        <p className="text-xs text-gray-500">
          Chi nhánh: <span className="text-gray-300 font-semibold">{cinemaName}</span>
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Mã phòng *</label>
          <input
            className={adminInputClass}
            value={form.roomCode}
            onChange={(e) => setForm((p) => ({ ...p, roomCode: e.target.value }))}
            placeholder="VD: P01"
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>Tên phòng *</label>
          <input
            className={adminInputClass}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="VD: Phòng 1 - IMAX"
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>Kiểu phòng *</label>
          <select
            className={adminSelectClass}
            value={form.roomType}
            onChange={(e) => setForm((p) => ({ ...p, roomType: e.target.value }))}
          >
            {roomTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label || t.value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Sức chứa (ghế)</label>
          <input
            type="number"
            min="1"
            className={adminInputClass}
            value={form.capacity}
            onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Trạng thái *</label>
          <select
            className={adminSelectClass}
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            {ROOM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          Tạo phòng
        </PrimaryButton>
      </div>
    </form>
  );
};

export default CinemaRoomFormPanel;
