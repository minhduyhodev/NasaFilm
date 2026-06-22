import { useEffect, useState } from 'react';
import { movieService } from '../../../../shared/services/movieService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const GenreFormPanel = ({ genre, onSuccess, onCancel }) => {
  const isEditing = Boolean(genre?.uuid);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    setName(genre?.name || '');
  }, [genre]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      notificationService.error('Tên thể loại không được để trống');
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        await movieService.updateGenre(genre.uuid, { name: trimmed });
        notificationService.success(`Cập nhật thể loại "${trimmed}"`);
      } else {
        await movieService.createGenre({ name: trimmed });
        notificationService.success(`Thêm thể loại "${trimmed}"`);
      }
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu thể loại thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={adminLabelClass}>Tên thể loại *</label>
        <input
          className={adminInputClass}
          placeholder="Ví dụ: Hành động, Kinh dị..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Thêm thể loại'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default GenreFormPanel;
