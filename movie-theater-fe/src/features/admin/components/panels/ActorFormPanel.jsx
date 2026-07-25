import { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { movieService } from '../../../../shared/services/movieService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton, AdminSelectDropdown } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';
import './ActorFormPanel.css';

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

  const countryOptions = useMemo(
    () =>
      (countriesList || []).map((c) => ({
        value: c.uuid,
        label: `${c.name} (${c.code})`,
      })),
    [countriesList],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      notificationService.error('Tên diễn viên không được để trống');
      return;
    }
    if (!formData.countryUuid) {
      notificationService.error('Vui lòng chọn quốc tịch');
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
    <form onSubmit={handleSubmit} className="actor-form">
      <div className="actor-form__field">
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

      <div className="actor-form__field">
        <label className={adminLabelClass}>URL ảnh chân dung</label>
        <input
          type="url"
          className={adminInputClass}
          placeholder="https://..."
          value={formData.avatarUrl}
          onChange={(e) => setFormData((p) => ({ ...p, avatarUrl: e.target.value }))}
        />
        {formData.avatarUrl?.trim().startsWith('http') && (
          <div className="actor-form__preview">
            <div className="actor-form__avatar">
              <img
                src={formData.avatarUrl.trim()}
                alt=""
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <span className="actor-form__preview-label">Xem trước</span>
          </div>
        )}
      </div>

      <div className="actor-form__field">
        <AdminSelectDropdown
          label="Quốc tịch *"
          value={formData.countryUuid}
          options={countryOptions}
          onChange={(val) => setFormData((p) => ({ ...p, countryUuid: val }))}
          placeholder="Chọn quốc tịch..."
          searchPlaceholder="Tìm quốc gia, mã quốc gia..."
          searchable
          emptyMessage="Không tìm thấy quốc gia phù hợp"
        />
        <p className="actor-form__hint">
          <Globe className="actor-form__hint-icon" aria-hidden="true" />
          Gõ tên hoặc mã quốc gia để lọc nhanh danh sách.
        </p>
      </div>

      <div className="actor-form__actions">
        <GhostButton type="button" onClick={onCancel}>
          Hủy
        </GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Thêm diễn viên'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default ActorFormPanel;
