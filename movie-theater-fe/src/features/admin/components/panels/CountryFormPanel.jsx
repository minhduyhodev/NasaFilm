import { useEffect, useState } from 'react';
import { movieService } from '../../../../shared/services/movieService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const CountryFormPanel = ({ country, onSuccess, onCancel }) => {
  const isEditing = Boolean(country?.uuid);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '' });

  useEffect(() => {
    setForm({
      code: country?.code || '',
      name: country?.name || '',
    });
  }, [country]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name) {
      notificationService.error('Mã và tên quốc gia không được để trống');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { code, name };
      if (isEditing) {
        await movieService.updateCountry(country.uuid, payload);
        notificationService.success(`Cập nhật quốc gia "${name}"`);
      } else {
        await movieService.createCountry(payload);
        notificationService.success(`Thêm quốc gia "${name}"`);
      }
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu quốc gia thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={adminLabelClass}>Mã quốc gia *</label>
        <input
          className={`${adminInputClass} uppercase font-mono`}
          placeholder="VN, US, KR..."
          maxLength={10}
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Tên quốc gia *</label>
        <input
          className={adminInputClass}
          placeholder="Việt Nam, Hoa Kỳ..."
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Thêm quốc gia'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default CountryFormPanel;
