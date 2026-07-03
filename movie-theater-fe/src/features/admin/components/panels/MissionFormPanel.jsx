import React, { useEffect, useState } from 'react';
import {
  adminMissionService,
  MISSION_CAMPAIGN_STATUSES,
  MISSION_CONDITION_TYPES,
  MISSION_RECURRENCE_TYPES,
} from '../../api/adminMissionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../adminFormStyles';

const emptyForm = {
  code: '',
  title: '',
  description: '',
  conditionType: 'GENRE_WINDOW',
  conditionJson: '{}',
  recurrence: 'ONCE',
  campaignUuid: '',
  rewardPoints: 0,
  rewardBadgeCode: '',
  rewardBadgeTitle: '',
  requiresFeature: '',
  targetValue: 1,
  active: true,
  sortOrder: 0,
};

const MissionFormPanel = ({ template, campaigns = [], onSuccess, onCancel }) => {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!template) {
      setForm(emptyForm);
      return;
    }
    setForm({
      code: template.code || '',
      title: template.title || '',
      description: template.description || '',
      conditionType: template.conditionType || 'GENRE_WINDOW',
      conditionJson: template.conditionJson || '{}',
      recurrence: template.recurrence || 'ONCE',
      campaignUuid: template.campaignUuid || '',
      rewardPoints: template.rewardPoints ?? 0,
      rewardBadgeCode: template.rewardBadgeCode || '',
      rewardBadgeTitle: template.rewardBadgeTitle || '',
      requiresFeature: template.requiresFeature || '',
      targetValue: template.targetValue ?? 1,
      active: template.active !== false,
      sortOrder: template.sortOrder ?? 0,
    });
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      notificationService.error('Mã và tên nhiệm vụ không được để trống.');
      return;
    }
    setIsSaving(true);
    try {
      await adminMissionService.upsertTemplate({
        ...form,
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        campaignUuid: form.campaignUuid || null,
        rewardBadgeCode: form.rewardBadgeCode.trim() || null,
        rewardBadgeTitle: form.rewardBadgeTitle.trim() || null,
        requiresFeature: form.requiresFeature.trim() || null,
      });
      notificationService.success('Đã lưu nhiệm vụ.');
      onSuccess?.();
    } catch (error) {
      notificationService.error(error.message || 'Không thể lưu nhiệm vụ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Mã nhiệm vụ</label>
          <input className={adminInputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div>
          <label className={adminLabelClass}>Tên hiển thị</label>
          <input className={adminInputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={adminLabelClass}>Mô tả</label>
        <textarea className={adminInputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={adminLabelClass}>Loại điều kiện</label>
          <select className={adminSelectClass} value={form.conditionType} onChange={(e) => setForm({ ...form, conditionType: e.target.value })}>
            {MISSION_CONDITION_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Chu kỳ</label>
          <select className={adminSelectClass} value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
            {MISSION_RECURRENCE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Chiến dịch</label>
          <select className={adminSelectClass} value={form.campaignUuid} onChange={(e) => setForm({ ...form, campaignUuid: e.target.value })}>
            <option value="">Không gắn chiến dịch</option>
            {campaigns.map((campaign) => (
              <option key={campaign.uuid} value={campaign.uuid}>{campaign.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className={adminLabelClass}>Mục tiêu</label>
          <input type="number" min="1" className={adminInputClass} value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })} />
        </div>
        <div>
          <label className={adminLabelClass}>Điểm thưởng</label>
          <input type="number" min="0" className={adminInputClass} value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: Number(e.target.value) })} />
        </div>
        <div>
          <label className={adminLabelClass}>Thứ tự</label>
          <input type="number" className={adminInputClass} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Đang bật
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={adminLabelClass}>Mã huy hiệu</label>
          <input className={adminInputClass} value={form.rewardBadgeCode} onChange={(e) => setForm({ ...form, rewardBadgeCode: e.target.value })} />
        </div>
        <div>
          <label className={adminLabelClass}>Tên huy hiệu</label>
          <input className={adminInputClass} value={form.rewardBadgeTitle} onChange={(e) => setForm({ ...form, rewardBadgeTitle: e.target.value })} />
        </div>
        <div>
          <label className={adminLabelClass}>Yêu cầu feature</label>
          <input className={adminInputClass} value={form.requiresFeature} onChange={(e) => setForm({ ...form, requiresFeature: e.target.value })} placeholder="ORBIT_SEAT" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu nhiệm vụ'}</PrimaryButton>
      </div>
    </form>
  );
};

export default MissionFormPanel;
