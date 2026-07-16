import { useState, useEffect } from 'react';
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

const CinemaRoomFormPanel = ({ cinemaUuid, cinemaName, room, onSuccess, onCancel }) => {
  const isEditing = Boolean(room?.uuid);
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

  useEffect(() => {
    if (room) {
      setForm({
        roomCode: room.roomCode || '',
        name: room.name || '',
        roomType: room.roomType || 'STANDARD',
        capacity: room.capacity || 0,
        status: room.status || 'ACTIVE',
      });
    } else {
      setForm(emptyForm);
    }
  }, [room]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roomCode.trim() || !form.name.trim()) {
      notificationService.error('Vui lòng điền mã và tên phòng');
      return;
    }
    if (!isEditing) {
      const capacityValue = Number(form.capacity);
      if (!Number.isFinite(capacityValue) || capacityValue < 1 || capacityValue > 1000) {
        notificationService.error('Sức chứa phải là số từ 1 đến 1000');
        return;
      }
    }
    setIsSaving(true);
    try {
      const payload = {
        roomCode: form.roomCode.trim(),
        name: form.name.trim(),
        roomType: form.roomType,
        status: form.status,
      };
      if (!isEditing) {
        payload.capacity = Number(form.capacity) || 0;
        await cinemaService.createRoom(cinemaUuid, payload);
        notificationService.success('Tạo phòng chiếu thành công');
      } else {
        await cinemaService.updateRoom(room.uuid, payload);
        notificationService.success('Cập nhật phòng thành công');
      }
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEditing && cinemaName && (
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
        {!isEditing ? (
          <div>
            <label className={adminLabelClass}>Sức chứa (ghế)</label>
            <input
              type="number"
              min="1"
              max="1000"
              className={adminInputClass}
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
            />
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Chỉ là số ước tính ban đầu — sẽ tự động đồng bộ theo số ghế thực tế khi bạn tạo sơ đồ ghế ở trang quản lý phòng.
            </p>
          </div>
        ) : (
          <div>
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
        )}
        {!isEditing && (
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
        )}
      </div>
      {isEditing && (form.status === 'DISABLED' || form.status === 'MAINTENANCE') && (
        <p className="text-xs text-amber-400/90 leading-relaxed">
          Các suất chiếu tương lai của phòng sẽ tự động bị hủy khi lưu trạng thái này.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Tạo phòng'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default CinemaRoomFormPanel;
