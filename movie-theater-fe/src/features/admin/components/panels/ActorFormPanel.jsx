import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { movieService } from '../../../../shared/services/movieService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const ActorFormPanel = ({ actor, countriesList, onSuccess, onCancel }) => {
  const isEditing = Boolean(actor?.uuid);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    avatarUrl: '',
    countryUuid: '',
  });

  useEffect(() => {
    setFormData({
      fullName: actor?.fullName || '',
      avatarUrl: actor?.avatarUrl || '',
      countryUuid: actor?.countryUuid || countriesList?.[0]?.uuid || '',
    });
  }, [actor, countriesList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      notificationService.error('Tên diễn viên không được để trống');
      return;
    }
    const payload = {
      fullName: formData.fullName.trim(),
      avatarUrl: formData.avatarUrl.trim() || null,
      countryUuid: formData.countryUuid || null,
    };
    setIsSaving(true);
    try {
      if (isEditing) {
        await movieService.updateActor(actor.uuid, payload);
        notificationService.success(`Cập nhật thành công "${payload.fullName}"`);
      } else {
        await movieService.createActor(payload);
        notificationService.success(`Thêm mới thành công "${payload.fullName}"`);
      }
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu thông tin thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={adminLabelClass}>Họ và tên *</label>
        <input
          type="text"
          className={adminInputClass}
          placeholder="Nhập tên diễn viên..."
          value={formData.fullName}
          onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>URL ảnh chân dung</label>
        <input
          type="url"
          className={adminInputClass}
          placeholder="https://..."
          value={formData.avatarUrl}
          onChange={(e) => setFormData((p) => ({ ...p, avatarUrl: e.target.value }))}
        />
        {formData.avatarUrl?.trim().startsWith('http') && (
          <div className="mt-3 flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-white/[0.03]">
              <img src={formData.avatarUrl.trim()} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <span className="text-xs text-gray-500">Xem trước</span>
          </div>
        )}
      </div>
      <div>
        <label className={adminLabelClass}>Quốc tịch *</label>
        <select
          className={`${adminInputClass} cursor-pointer`}
          value={formData.countryUuid}
          onChange={(e) => setFormData((p) => ({ ...p, countryUuid: e.target.value }))}
          required
        >
          {countriesList.map((c) => (
            <option key={c.uuid} value={c.uuid} style={{ background: '#0F1322' }}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Thêm diễn viên'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default ActorFormPanel;
