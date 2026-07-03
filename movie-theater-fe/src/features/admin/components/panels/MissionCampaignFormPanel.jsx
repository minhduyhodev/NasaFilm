import { useEffect, useState } from 'react';
import { adminMissionService, MISSION_CAMPAIGN_STATUSES } from '../../api/adminMissionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass, adminTextareaClass } from '../adminFormStyles';

const emptyForm = {
  code: '',
  title: '',
  description: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
};

const STATUS_HINTS = {
  DRAFT: 'Nhiệm vụ gắn chiến dịch sẽ ẩn với khán giả.',
  ACTIVE: 'Chiến dịch hiện trên tab Nhiệm vụ của khách.',
  ARCHIVED: 'Đã kết thúc — nhiệm vụ gắn sẽ không hiện.',
};

const MissionCampaignFormPanel = ({ campaign, onSuccess, onCancel }) => {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!campaign) {
      setForm(emptyForm);
      return;
    }
    setForm({
      code: campaign.code || '',
      title: campaign.title || '',
      description: campaign.description || '',
      status: campaign.status || 'DRAFT',
      startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 16) : '',
      endsAt: campaign.endsAt ? campaign.endsAt.slice(0, 16) : '',
    });
  }, [campaign]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      notificationService.error('Mã và tên chiến dịch không được để trống.');
      return;
    }
    setIsSaving(true);
    try {
      await adminMissionService.upsertCampaign({
        ...form,
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        sortOrder: campaign?.sortOrder ?? 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      });
      notificationService.success('Đã lưu chiến dịch.');
      onSuccess?.();
    } catch (error) {
      notificationService.error(error.message || 'Không thể lưu chiến dịch.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mc-form mc-form--compact">
      <div className="mc-form-grid">
        <div className="mc-form-field">
          <label className={adminLabelClass}>Mã</label>
          <input
            className={adminInputClass}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="MUA_HE_2026"
            disabled={Boolean(campaign)}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Tên</label>
          <input
            className={adminInputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Mùa hè NASA 2026"
          />
        </div>
        <div className="mc-form-field mc-form-field--full">
          <label className={adminLabelClass}>Mô tả</label>
          <textarea
            className={adminTextareaClass}
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Tùy chọn"
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Trạng thái</label>
          <select
            className={adminSelectClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {MISSION_CAMPAIGN_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <p className="mc-form-note">{STATUS_HINTS[form.status]}</p>
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Bắt đầu</label>
          <input
            type="datetime-local"
            className={adminInputClass}
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Kết thúc</label>
          <input
            type="datetime-local"
            className={adminInputClass}
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </div>
      </div>

      <div className="mc-form-actions">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" disabled={isSaving}>
          {isSaving ? 'Đang lưu...' : 'Lưu'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default MissionCampaignFormPanel;
