import React, { useEffect, useState } from 'react';
import { cinemaService } from '../../../../shared/services/cinemaService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../adminFormStyles';

const CinemaFormPanel = ({ cinema, onSuccess, onCancel }) => {
  const isEditing = Boolean(cinema?.uuid);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    entranceNote: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    setForm({
      name: cinema?.name || '',
      address: cinema?.address || '',
      phoneNumber: cinema?.phoneNumber || '',
      entranceNote: cinema?.entranceNote || '',
      latitude: cinema?.latitude ?? '',
      longitude: cinema?.longitude ?? '',
      status: cinema?.status || 'ACTIVE',
    });
  }, [cinema]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.phoneNumber.trim()) {
      notificationService.error('Vui lòng điền đầy đủ thông tin chi nhánh');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        entranceNote: form.entranceNote.trim() || null,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        status: form.status,
      };
      if (isEditing) {
        await cinemaService.updateCinema(cinema.uuid, payload);
        notificationService.success('Cập nhật chi nhánh thành công');
        onSuccess?.(cinema);
      } else {
        const created = await cinemaService.createCinema(payload);
        notificationService.success('Thêm chi nhánh mới thành công');
        onSuccess?.(created);
      }
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={adminLabelClass}>Tên chi nhánh *</label>
        <input
          className={adminInputClass}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="VD: NASA Film Landmark 81"
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Địa chỉ *</label>
        <input
          className={adminInputClass}
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          placeholder="Số nhà, quận, thành phố"
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Số điện thoại *</label>
        <input
          className={adminInputClass}
          value={form.phoneNumber}
          onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          placeholder="028xxxxxxx"
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Hướng dẫn vào cổng</label>
        <textarea
          className={`${adminInputClass} min-h-[88px] resize-y`}
          value={form.entranceNote}
          onChange={(e) => setForm((p) => ({ ...p, entranceNote: e.target.value }))}
          placeholder="VD: Cổng VIP: tầng B2, thang máy phía Đông Landmark 81"
        />
      </div>
      <div>
        <label className={adminLabelClass}>Trạng thái *</label>
        <select
          className={adminSelectClass}
          value={form.status}
          onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="ACTIVE">Hoạt động</option>
          <option value="MAINTENANCE">Bảo trì</option>
          <option value="DISABLED">Vô hiệu hóa</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Vĩ độ (latitude)</label>
          <input
            className={adminInputClass}
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
            placeholder="10.7951"
          />
        </div>
        <div>
          <label className={adminLabelClass}>Kinh độ (longitude)</label>
          <input
            className={adminInputClass}
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
            placeholder="106.7218"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Thêm chi nhánh'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default CinemaFormPanel;
