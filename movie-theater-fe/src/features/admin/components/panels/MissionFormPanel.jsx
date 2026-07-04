import { useEffect, useMemo, useState } from 'react';
import {
  adminMissionService,
  getMissionPreset,
  MISSION_CONDITION_TYPES,
  MISSION_PRESETS,
  MISSION_RECURRENCE_TYPES,
} from '../../api/adminMissionService';
import { getFeatureLabel, getMissionDisplayTitle } from '../../utils/missionAdminUtils';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass, adminTextareaClass } from '../adminFormStyles';

const CUSTOM_OPTION = '__CUSTOM__';

const CONDITION_JSON_DEFAULTS = {
  GENRE_WINDOW: '{"windowDays":30}',
  PREMIERE_BOOKING: '{"windowDays":3}',
  MATCHMAKER_QUIZ: '{}',
};

const emptyCustomForm = () => ({
  code: '',
  title: '',
  description: '',
  conditionType: 'GENRE_WINDOW',
  conditionJson: CONDITION_JSON_DEFAULTS.GENRE_WINDOW,
  recurrence: 'ONCE',
  campaignUuid: '',
  startsAt: '',
  endsAt: '',
  rewardPoints: 100,
  rewardBadgeCode: '',
  rewardBadgeTitle: '',
  requiresFeature: '',
  targetValue: 1,
  active: true,
  sortOrder: 0,
});

const buildFormFromPreset = (preset, overrides = {}) => ({
  code: preset.code,
  title: preset.title,
  description: preset.description,
  conditionType: preset.conditionType,
  conditionJson: preset.conditionJson,
  recurrence: preset.recurrence,
  campaignUuid: '',
  startsAt: '',
  endsAt: '',
  rewardPoints: preset.rewardPoints,
  rewardBadgeCode: preset.rewardBadgeCode || '',
  rewardBadgeTitle: preset.rewardBadgeTitle || '',
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
  campaignUuid: template.campaignUuid ? String(template.campaignUuid) : '',
  startsAt: template.startsAt ? template.startsAt.slice(0, 16) : '',
  endsAt: template.endsAt ? template.endsAt.slice(0, 16) : '',
  rewardPoints: template.rewardPoints ?? 0,
  rewardBadgeCode: template.rewardBadgeCode || '',
  rewardBadgeTitle: template.rewardBadgeTitle || '',
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

const resolveRequiresFeature = (conditionType) =>
  conditionType === 'ORBIT_ROOM_JOIN' ? 'ORBIT_SEAT' : '';

const parseWindowDays = (conditionJson) => {
  try {
    const parsed = JSON.parse(conditionJson || '{}');
    return parsed.windowDays ?? '';
  } catch {
    return '';
  }
};

const withWindowDays = (conditionJson, days) => {
  try {
    const parsed = JSON.parse(conditionJson || '{}');
    return JSON.stringify({ ...parsed, windowDays: Number(days) || 1 });
  } catch {
    return JSON.stringify({ windowDays: Number(days) || 1 });
  }
};

const usesWindowDays = (conditionType) =>
  conditionType === 'GENRE_WINDOW' || conditionType === 'PREMIERE_BOOKING';

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

  const [mode, setMode] = useState('preset');
  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      const nextForm = buildFormFromTemplate(template);
      setForm(nextForm);
      setMode(getMissionPreset(template.code) ? 'preset' : 'custom');
      return;
    }

    const firstOpenPreset = MISSION_PRESETS.find((item) => !usedCodes.has(item.code));
    if (firstOpenPreset) {
      setMode('preset');
      setForm(resolveFormForCode(firstOpenPreset.code, existingTemplates));
      return;
    }

    setMode('custom');
    setForm(emptyCustomForm());
  }, [template, existingTemplates, usedCodes]);

  const preset = getMissionPreset(form?.code);
  const isCustomMission = mode === 'custom' || (isEditing && !preset);
  const selectValue = mode === 'custom' ? CUSTOM_OPTION : form?.code || '';

  const handleTypeChange = (value) => {
    if (value === CUSTOM_OPTION) {
      setMode('custom');
      setForm(emptyCustomForm());
      return;
    }
    setMode('preset');
    const nextForm = resolveFormForCode(value, existingTemplates);
    if (nextForm) {
      setForm(nextForm);
    }
  };

  const handleConditionChange = (conditionType) => {
    setForm((prev) => ({
      ...prev,
      conditionType,
      conditionJson: CONDITION_JSON_DEFAULTS[conditionType] || '{}',
      requiresFeature: resolveRequiresFeature(conditionType),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form?.code?.trim().toUpperCase();
    if (!code) {
      notificationService.error(isCustomMission ? 'Mã nhiệm vụ không được để trống.' : 'Hãy chọn loại nhiệm vụ.');
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      notificationService.error('Mã chỉ gồm chữ in hoa, số và dấu gạch dưới.');
      return;
    }
    if (!form.title.trim()) {
      notificationService.error('Tên không được để trống.');
      return;
    }
    if (!isEditing && mode === 'custom' && usedCodes.has(code)) {
      notificationService.error('Mã này đã tồn tại. Hãy chọn mã khác hoặc Sửa nhiệm vụ hiện có.');
      return;
    }
    setIsSaving(true);
    try {
      await adminMissionService.upsertTemplate({
        ...form,
        code,
        title: form.title.trim(),
        description: form.description.trim(),
        campaignUuid: form.campaignUuid || null,
        rewardBadgeCode: form.rewardBadgeCode?.trim() || null,
        rewardBadgeTitle: form.rewardBadgeTitle?.trim() || null,
        requiresFeature: form.requiresFeature?.trim() || null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      });
      notificationService.success(isEditing ? 'Đã cập nhật nhiệm vụ.' : 'Đã thêm nhiệm vụ.');
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
        {isEditing ? (
          isCustomMission ? (
            <div className="mc-form-field mc-form-field--full">
              <label className={adminLabelClass}>Mã</label>
              <div className="mc-form-static">{form.code}</div>
            </div>
          ) : (
            <div className="mc-form-field mc-form-field--full">
              <label className={adminLabelClass}>Loại</label>
              <div className="mc-form-static">
                {preset?.label || getMissionDisplayTitle({ code: form.code, title: form.title })}
              </div>
            </div>
          )
        ) : (
          <div className="mc-form-field mc-form-field--full">
            <label className={adminLabelClass} htmlFor="mission-preset">Loại</label>
            <select
              id="mission-preset"
              className={adminSelectClass}
              value={selectValue}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {MISSION_PRESETS.map((item) => (
                <option
                  key={item.code}
                  value={item.code}
                  disabled={usedCodes.has(item.code)}
                >
                  {item.label}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>Loại mới…</option>
            </select>
          </div>
        )}

        {isCustomMission && !isEditing && (
          <div className="mc-form-field mc-form-field--full">
            <label className={adminLabelClass}>Mã</label>
            <input
              className={adminInputClass}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER_WATCH"
            />
          </div>
        )}

        {isCustomMission && (
          <div className="mc-form-field mc-form-field--full">
            <label className={adminLabelClass}>Hành động theo dõi</label>
            <select
              className={adminSelectClass}
              value={form.conditionType}
              onChange={(e) => handleConditionChange(e.target.value)}
            >
              {MISSION_CONDITION_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        )}

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
            value={form.campaignUuid ? String(form.campaignUuid) : ''}
            onChange={(e) => setForm({ ...form, campaignUuid: e.target.value })}
          >
            <option value="">Không gắn</option>
            {campaigns.map((campaign) => (
              <option key={campaign.uuid} value={String(campaign.uuid)}>{campaign.title}</option>
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
        {usesWindowDays(form.conditionType) && (
          <div className="mc-form-field">
            <label className={adminLabelClass}>Cửa sổ (ngày)</label>
            <input
              type="number"
              min="1"
              max="365"
              className={adminInputClass}
              value={parseWindowDays(form.conditionJson)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  conditionJson: withWindowDays(prev.conditionJson, e.target.value),
                }))
              }
            />
          </div>
        )}
        <div className="mc-form-field">
          <label className={adminLabelClass}>Thứ tự hiển thị</label>
          <input
            type="number"
            min="0"
            className={adminInputClass}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Bắt đầu (tuỳ chọn)</label>
          <input
            type="datetime-local"
            className={adminInputClass}
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Kết thúc (tuỳ chọn)</label>
          <input
            type="datetime-local"
            className={adminInputClass}
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </div>
        <div className="mc-form-field">
          <label className={adminLabelClass}>Mã huy hiệu (tuỳ chọn)</label>
          <input
            className={adminInputClass}
            value={form.rewardBadgeCode}
            onChange={(e) => setForm({ ...form, rewardBadgeCode: e.target.value })}
            placeholder="EXPLORER_BADGE"
          />
        </div>
        <div className="mc-form-field mc-form-field--full">
          <label className={adminLabelClass}>Tên huy hiệu (tuỳ chọn)</label>
          <input
            className={adminInputClass}
            value={form.rewardBadgeTitle}
            onChange={(e) => setForm({ ...form, rewardBadgeTitle: e.target.value })}
            placeholder="Nhà thám hiểm"
          />
        </div>
      </div>

      {form.campaignUuid && (
        <p className="mc-form-note">
          Nhiệm vụ chỉ hiện với khán giả khi chiến dịch <strong>Đang chạy</strong> và còn trong thời gian.
        </p>
      )}

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
          Khóa tới khi có {getFeatureLabel(form.requiresFeature)}.
          {form.code === 'SOCIAL_ORBIT' && ' Tính năng chưa kích hoạt trên hệ thống.'}
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
