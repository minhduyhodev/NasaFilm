import React, { useEffect, useState } from 'react';
import { adminMissionService, MISSION_CAMPAIGN_STATUSES } from '../../api/adminMissionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../adminFormStyles';

const emptyForm = {
  code: '',
  title: '',
  description: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
  sortOrder: 0,
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
      sortOrder: campaign.sortOrder ?? 0,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Mã chiến dịch</label>
          <input className={adminInputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div>
          <label className={adminLabelClass}>Tên chiến dịch</label>
          <input className={adminInputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={adminLabelClass}>Mô tả</label>
        <textarea className={adminInputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className={adminLabelClass}>Trạng thái</label>
          <select className={adminSelectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {MISSION_CAMPAIGN_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Bắt đầu</label>
          <input type="datetime-local" className={adminInputClass} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </div>
        <div>
          <label className={adminLabelClass}>Kết thúc</label>
          <input type="datetime-local" className={adminInputClass} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
        </div>
        <div>
          <label className={adminLabelClass}>Thứ tự</label>
          <input type="number" className={adminInputClass} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu chiến dịch'}</PrimaryButton>
      </div>
    </form>
  );
};

export default MissionCampaignFormPanel;
