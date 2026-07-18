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
import { PrimaryButton, GhostButton, AdminDateTimePicker, AdminSelectDropdown } from '..';
import { adminInputClass, adminTextareaClass } from '../adminFormStyles';

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

const fieldLabelClass = 'mc-form__label';

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

  const typeOptions = useMemo(
    () => [
      ...MISSION_PRESETS.map((item) => ({
        value: item.code,
        label: usedCodes.has(item.code) ? `${item.label} (đã dùng)` : item.label,
        disabled: usedCodes.has(item.code),
      })),
      { value: CUSTOM_OPTION, label: 'Loại mới…' },
    ],
    [usedCodes],
  );

  const conditionOptions = useMemo(
    () => MISSION_CONDITION_TYPES.map((item) => ({ value: item.value, label: item.label })),
    [],
  );

  const recurrenceOptions = useMemo(
    () => MISSION_RECURRENCE_TYPES.map((item) => ({ value: item.value, label: item.label })),
    [],
  );

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'Không gắn' },
      ...campaigns.map((campaign) => ({
        value: String(campaign.uuid),
        label: campaign.title,
      })),
    ],
    [campaigns],
  );

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
              <label className={fieldLabelClass}>Mã</label>
              <div className="mc-form-static">{form.code}</div>
            </div>
          ) : (
            <div className="mc-form-field mc-form-field--full">
              <label className={fieldLabelClass}>Loại</label>
              <div className="mc-form-static">
                {preset?.label || getMissionDisplayTitle({ code: form.code, title: form.title })}
              </div>
            </div>
          )
        ) : (
          <div className="mc-form-field mc-form-field--full">
            <AdminSelectDropdown
              label="Loại"
              labelClassName={fieldLabelClass}
              value={selectValue}
              options={typeOptions}
              onChange={handleTypeChange}
              placeholder="Chọn loại nhiệm vụ"
            />
          </div>
        )}

        {isCustomMission && !isEditing && (
          <div className="mc-form-field mc-form-field--full">
            <label className={fieldLabelClass}>Mã</label>
            <input
              className={`${adminInputClass} mc-form__input`}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER_WATCH"
            />
          </div>
        )}

        {isCustomMission && (
          <div className="mc-form-field mc-form-field--full">
            <AdminSelectDropdown
              label="Hành động theo dõi"
              labelClassName={fieldLabelClass}
              value={form.conditionType}
              options={conditionOptions}
              onChange={handleConditionChange}
            />
          </div>
        )}

        <div className="mc-form-field mc-form-field--full">
          <label className={fieldLabelClass}>Tên</label>
          <input
            className={`${adminInputClass} mc-form__input`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="mc-form-field mc-form-field--full">
          <label className={fieldLabelClass}>Mô tả</label>
          <textarea
            className={`${adminTextareaClass} mc-form__textarea`}
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="mc-form-field">
          <AdminSelectDropdown
            label="Chu kỳ"
            labelClassName={fieldLabelClass}
            value={form.recurrence}
            options={recurrenceOptions}
            onChange={(val) => setForm({ ...form, recurrence: val })}
          />
        </div>
        <div className="mc-form-field">
          <AdminSelectDropdown
            label="Chiến dịch"
            labelClassName={fieldLabelClass}
            value={form.campaignUuid ? String(form.campaignUuid) : ''}
            options={campaignOptions}
            onChange={(val) => setForm({ ...form, campaignUuid: val })}
          />
        </div>
        <div className="mc-form-field">
          <label className={fieldLabelClass}>Mục tiêu</label>
          <input
            type="number"
            min="1"
            className={`${adminInputClass} mc-form__input`}
            value={form.targetValue}
            onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })}
          />
        </div>
        <div className="mc-form-field">
          <label className={fieldLabelClass}>Điểm</label>
          <input
            type="number"
            min="0"
            className={`${adminInputClass} mc-form__input`}
            value={form.rewardPoints}
            onChange={(e) => setForm({ ...form, rewardPoints: Number(e.target.value) })}
          />
        </div>
        {usesWindowDays(form.conditionType) && (
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Cửa sổ (ngày)</label>
            <input
              type="number"
              min="1"
              max="365"
              className={`${adminInputClass} mc-form__input`}
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
          <label className={fieldLabelClass}>Thứ tự hiển thị</label>
          <input
            type="number"
            min="0"
            className={`${adminInputClass} mc-form__input`}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
        </div>
        <div className="mc-form-field mc-form-field--full">
          <AdminDateTimePicker
            label="Bắt đầu (tuỳ chọn)"
            timeLabel={null}
            value={form.startsAt}
            onChange={(v) => setForm({ ...form, startsAt: v })}
          />
        </div>
        <div className="mc-form-field mc-form-field--full">
          <AdminDateTimePicker
            label="Kết thúc (tuỳ chọn)"
            timeLabel={null}
            value={form.endsAt}
            onChange={(v) => setForm({ ...form, endsAt: v })}
          />
        </div>
        <div className="mc-form-field">
          <label className={fieldLabelClass}>Mã huy hiệu (tuỳ chọn)</label>
          <input
            className={`${adminInputClass} mc-form__input`}
            value={form.rewardBadgeCode}
            onChange={(e) => setForm({ ...form, rewardBadgeCode: e.target.value })}
            placeholder="EXPLORER_BADGE"
          />
        </div>
        <div className="mc-form-field">
          <label className={fieldLabelClass}>Tên huy hiệu (tuỳ chọn)</label>
          <input
            className={`${adminInputClass} mc-form__input`}
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
        <PrimaryButton type="submit" className="mc-form__submit" disabled={isSaving} loading={isSaving}>
          {isSaving ? 'Đang lưu...' : 'Lưu'}
        </PrimaryButton>
        <GhostButton type="button" className="mc-form__cancel" onClick={onCancel}>
          Hủy
        </GhostButton>
      </div>
    </form>
  );
};

export default MissionFormPanel;
