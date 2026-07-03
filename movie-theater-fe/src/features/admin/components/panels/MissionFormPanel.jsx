import { useEffect, useMemo, useState } from 'react';
import {
  adminMissionService,
  getMissionPreset,
  MISSION_PRESETS,
  MISSION_RECURRENCE_TYPES,
} from '../../api/adminMissionService';
import { getFeatureLabel, getMissionDisplayTitle } from '../../utils/missionAdminUtils';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass, adminTextareaClass } from '../adminFormStyles';

const buildFormFromPreset = (preset, overrides = {}) => ({
  code: preset.code,
  title: preset.title,
  description: preset.description,
  conditionType: preset.conditionType,
  conditionJson: preset.conditionJson,
  recurrence: preset.recurrence,
  campaignUuid: '',
  rewardPoints: preset.rewardPoints,
  requiresFeature: preset.requiresFeature || '',
  targetValue: preset.targetValue,
  active: true,
  sortOrder: preset.sortOrder,
  ...overrides,
});

const buildFormFromTemplate = (template) => ({
  code: template.code || '',
  title: template.title || '',
  description: template.description || '',
  conditionType: template.conditionType || 'GENRE_WINDOW',
  conditionJson: template.conditionJson || '{}',
  recurrence: template.recurrence || 'ONCE',
  campaignUuid: template.campaignUuid || '',
  rewardPoints: template.rewardPoints ?? 0,
  requiresFeature: template.requiresFeature || '',
  targetValue: template.targetValue ?? 1,
  active: template.active !== false,
  sortOrder: template.sortOrder ?? 0,
});

const resolveFormForCode = (code, existingTemplates) => {
  const existing = existingTemplates.find((item) => item.code === code);
  if (existing) {
    return buildFormFromTemplate(existing);
  }
  const preset = getMissionPreset(code);
  return preset ? buildFormFromPreset(preset) : null;
};

const MissionFormPanel = ({
  template,
  campaigns = [],
  existingTemplates = [],
  onSuccess,
  onCancel,
}) => {
  const isEditing = Boolean(template?.code);
  const usedCodes = useMemo(
    () => new Set(existingTemplates.map((item) => item.code)),
    [existingTemplates],
  );

  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setForm(buildFormFromTemplate(template));
      return;
    }
    const initialCode = MISSION_PRESETS[0]?.code;
    setForm(initialCode ? resolveFormForCode(initialCode, existingTemplates) : null);
  }, [template, existingTemplates]);

  const preset = getMissionPreset(form?.code);
  const isExistingType = form?.code ? usedCodes.has(form.code) : false;

  const handlePresetChange = (code) => {
    const nextForm = resolveFormForCode(code, existingTemplates);
    if (nextForm) {
      setForm(nextForm);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form?.code) {
      notificationService.error('Hãy chọn loại nhiệm vụ.');
      return;
    }
    if (!form.title.trim()) {
      notificationService.error('Tên không được để trống.');
      return;
    }
    setIsSaving(true);
    try {
      await adminMissionService.upsertTemplate({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        campaignUuid: form.campaignUuid || null,
        rewardBadgeCode: null,
        rewardBadgeTitle: null,
        requiresFeature: form.requiresFeature?.trim() || null,
      });
      notificationService.success(
        isExistingType && !isEditing
          ? 'Đã cập nhật nhiệm vụ.'
          : 'Đã lưu nhiệm vụ.',
      );
      onSuccess?.();
    } catch (error) {
      notificationService.error(error.message || 'Không thể lưu nhiệm vụ.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!form) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="mc-form mc-form--compact">
      <div className="mc-form-grid">
        <div className="mc-form-field mc-form-field--full">
          {isEditing ? (
            <>
              <label className={adminLabelClass}>Loại</label>
              <div className="mc-form-static">
                {preset?.label || getMissionDisplayTitle({ code: form.code, title: form.title })}
              </div>
            </>
          ) : (
            <>
              <label className={adminLabelClass} htmlFor="mission-preset">Loại</label>
              <select
                id="mission-preset"
                className={adminSelectClass}
                value={form.code}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {MISSION_PRESETS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                    {usedCodes.has(item.code) ? ' · đã có' : ''}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="mc-form-field mc-form-field--full">
          <label className={adminLabelClass}>Tên</label>
          <input
            className={adminInputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="mc-form-field mc-form-field--full">
          <label className={adminLabelClass}>Mô tả</label>
          <textarea
            className={adminTextareaClass}
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Chu kỳ</label>
          <select
            className={adminSelectClass}
            value={form.recurrence}
            onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
          >
            {MISSION_RECURRENCE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Chiến dịch</label>
          <select
            className={adminSelectClass}
            value={form.campaignUuid}
            onChange={(e) => setForm({ ...form, campaignUuid: e.target.value })}
          >
            <option value="">Không gắn</option>
            {campaigns.map((campaign) => (
              <option key={campaign.uuid} value={campaign.uuid}>{campaign.title}</option>
            ))}
          </select>
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Mục tiêu</label>
          <input
            type="number"
            min="1"
            className={adminInputClass}
            value={form.targetValue}
            onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Điểm</label>
          <input
            type="number"
            min="0"
            className={adminInputClass}
            value={form.rewardPoints}
            onChange={(e) => setForm({ ...form, rewardPoints: Number(e.target.value) })}
          />
        </div>
      </div>

      <label className="mc-form-toggle">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />
        Đang bật
      </label>

      {form.requiresFeature && (
        <p className="mc-form-note">
          Khóa tới khi có {getFeatureLabel(form.requiresFeature)}
        </p>
      )}

      <div className="mc-form-actions">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" disabled={isSaving}>
          {isSaving ? 'Đang lưu...' : 'Lưu'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default MissionFormPanel;
