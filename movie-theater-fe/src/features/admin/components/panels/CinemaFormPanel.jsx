import React, { useEffect, useState } from 'react';
import { cinemaService } from '../../../../shared/services/cinemaService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const CinemaFormPanel = ({ cinema, onSuccess, onCancel }) => {
  const isEditing = Boolean(cinema?.uuid);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phoneNumber: '' });

  useEffect(() => {
    setForm({
      name: cinema?.name || '',
      address: cinema?.address || '',
      phoneNumber: cinema?.phoneNumber || '',
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
